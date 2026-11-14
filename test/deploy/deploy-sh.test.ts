// deploy/prod/deploy.sh must never take the site down for a failed backup or
// migration, and must put the previous image back when the new one is not
// healthy. docker and sudo are stubbed; every call is recorded in order.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.resolve(__dirname, "../../deploy/prod/deploy.sh");
const TAG = `prod-${"a".repeat(40)}`;
let dir: string;

function stub(name: string, body: string) {
  const p = path.join(dir, "bin", name);
  writeFileSync(p, `#!/usr/bin/env bash\necho "${name} $*" >> "$CALLS"\n${body}\n`);
  chmodSync(p, 0o755);
}

function run(env: { BACKUP_RC?: string; MIGRATE_RC?: string; HEALTH?: string }) {
  const res = spawnSync("bash", [script, TAG], {
    encoding: "utf8",
    input: "",
    env: {
      NODE_ENV: "test",
      PATH: `${path.join(dir, "bin")}:${process.env.PATH}`,
      DEPLOY_DIR: dir,
      CALLS: path.join(dir, "calls"),
      BACKUP_RC: "0",
      MIGRATE_RC: "0",
      HEALTH: "healthy",
      ...env,
    },
  });
  const calls = readFileSync(path.join(dir, "calls"), "utf8").trim().split("\n");
  return { code: res.status, calls };
}

const idx = (calls: string[], re: RegExp) => calls.findIndex((c) => re.test(c));

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "deploy-sh-"));
  spawnSync("mkdir", [path.join(dir, "bin")]);
  writeFileSync(path.join(dir, "calls"), "");
  stub("sudo", 'exit "$BACKUP_RC"');
  stub(
    "docker",
    `case "$*" in
  "image inspect sha256:prev"*) echo "ghcr.io/shaman-kathmandu/shamanktmweb:prod-${"b".repeat(40)}" ;;
  "image inspect"*) exit 0 ;;
  "inspect shaman-web --format {{.Image}}") echo sha256:prev ;;
  "inspect shaman-web"*) echo "$HEALTH" ;;
  "compose run"*) exit "$MIGRATE_RC" ;;
esac
exit 0`,
  );
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("deploy.sh", () => {
  it("backs up, migrates with the new image, then switches", () => {
    const { code, calls } = run({});
    expect(code).toBe(0);
    const backup = idx(calls, /^sudo -n .*backup-db\.sh$/);
    const migrate = idx(calls, /^docker compose run --rm --no-deps -T -e RUN_DB_SEED=0 app true$/);
    const retag = idx(calls, new RegExp(`^docker tag \\S+:${TAG} \\S+:prod$`));
    const up = idx(calls, /^docker compose up -d --no-deps app$/);
    expect(backup).toBeGreaterThan(-1);
    expect([backup < migrate, migrate < retag, retag < up]).toEqual([true, true, true]);
    expect(readFileSync(path.join(dir, "deploys.log"), "utf8")).toContain(
      `previous=prod-${"b".repeat(40)} (sha256:prev)`,
    );
  });

  it("aborts without touching the app when the backup fails", () => {
    const { code, calls } = run({ BACKUP_RC: "1" });
    expect(code).toBe(1);
    expect(idx(calls, /^docker (tag|compose)/)).toBe(-1);
  });

  it("aborts without touching the app when the migration fails", () => {
    const { code, calls } = run({ MIGRATE_RC: "1" });
    expect(code).toBe(1);
    expect(idx(calls, /^docker tag|^docker compose up/)).toBe(-1);
  });

  it("puts the previous image back when the new one is unhealthy", () => {
    const { code, calls } = run({ HEALTH: "unhealthy" });
    expect(code).toBe(1);
    const rollback = idx(calls, /^docker tag sha256:prev \S+:prod$/);
    expect(rollback).toBeGreaterThan(idx(calls, new RegExp(`^docker tag \\S+:${TAG}`)));
    expect(calls.slice(rollback + 1)).toContain("docker compose up -d --no-deps app");
  });
});

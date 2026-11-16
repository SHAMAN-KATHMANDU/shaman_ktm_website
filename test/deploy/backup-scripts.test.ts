// backup-db.sh must fail loudly (non-zero + alert URL) and ping the heartbeat
// only on success; restore-test.sh must fail when the dump does not restore or
// restores an empty catalog. docker, aws and curl are stubbed.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const prod = path.resolve(__dirname, "../../deploy/prod");
let dir: string;

function stub(name: string, body: string) {
  const p = path.join(dir, "bin", name);
  writeFileSync(p, `#!/usr/bin/env bash\necho "${name} $*" >> "$CALLS"\n${body}\n`);
  chmodSync(p, 0o755);
}

function run(script: string, env: Record<string, string>, args: string[] = []) {
  const res = spawnSync("bash", [path.join(prod, script), ...args], {
    encoding: "utf8",
    input: "",
    env: {
      NODE_ENV: "test",
      PATH: `${path.join(dir, "bin")}:${process.env.PATH}`,
      SHAMAN_DIR: dir,
      CALLS: path.join(dir, "calls"),
      ...env,
    },
  });
  return { code: res.status, calls: readFileSync(path.join(dir, "calls"), "utf8") };
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "backup-sh-"));
  mkdirSync(path.join(dir, "bin"));
  writeFileSync(path.join(dir, "calls"), "");
  writeFileSync(
    path.join(dir, ".env"),
    'BACKUP_ALERT_URL="https://alert.test/x"\nBACKUP_HEARTBEAT_URL=https://beat.test/y\n',
  );
  stub("aws", "exit 0");
  stub("curl", "exit 0");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("backup-db.sh", () => {
  it("pings the heartbeat and keeps the latest dump on success", () => {
    stub("docker", 'case "$*" in *pg_dump*) printf DUMP ;; esac; exit 0');
    const { code, calls } = run("backup-db.sh", {});
    expect(code).toBe(0);
    expect(calls).toContain("curl -fsS -m 15 https://beat.test/y");
    expect(calls).not.toContain("alert.test");
    expect(readFileSync(path.join(dir, "backups/latest.dump"), "utf8")).toBe("DUMP");
  });

  it("exits non-zero and posts the alert when pg_dump fails", () => {
    stub("docker", "exit 1");
    const { code, calls } = run("backup-db.sh", {});
    expect(code).not.toBe(0);
    expect(calls).toMatch(/curl .*https:\/\/alert\.test\/x/);
    expect(calls).not.toContain("beat.test");
    expect(calls).not.toMatch(/^aws /m);
  });
});

describe("restore-test.sh", () => {
  const dockerStub = (restoreRc: number, products: number) =>
    stub(
      "docker",
      `case "$*" in
  *pg_restore*) exit ${restoreRc} ;;
  *'"Product"'*) echo ${products} ;;
  *psql*) echo 3 ;;
esac
exit 0`,
    );

  beforeEach(() => {
    mkdirSync(path.join(dir, "backups"));
    writeFileSync(path.join(dir, "backups/latest.dump"), "DUMP");
  });

  it("passes and removes the throwaway container", () => {
    dockerStub(0, 12);
    const { code, calls } = run("restore-test.sh", {});
    expect(code).toBe(0);
    expect(calls).toMatch(/docker run -d --rm --name shaman-restore-test-\d+ --network none/);
    expect(calls).not.toContain("shaman-db");
    expect(calls).toMatch(/docker rm -f shaman-restore-test-\d+/);
  });

  it("fails when pg_restore fails", () => {
    dockerStub(1, 12);
    expect(run("restore-test.sh", {}).code).not.toBe(0);
  });

  it("fails when the restored catalog is empty", () => {
    dockerStub(0, 0);
    expect(run("restore-test.sh", {}).code).not.toBe(0);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(__dirname, "../..");
let binDir: string;

beforeEach(() => {
  binDir = mkdtempSync(path.join(tmpdir(), "check-env-bin-"));
  const docker = path.join(binDir, "docker");
  writeFileSync(
    docker,
    `#!/usr/bin/env bash
set -euo pipefail
case "\${1:-}" in
  inspect) exit 0 ;;
  exec)
    export DATABASE_URL=abc
    export SMTP_HOST=
    export SMTP_FROM_NAME="Shaman Kathmandu"
    unset TELEGRAM_WEBHOOK_SECRET
    exec "\${@:3}"
    ;;
  *) exit 2 ;;
esac
`,
  );
  chmodSync(docker, 0o755);
});

afterEach(() => rmSync(binDir, { recursive: true, force: true }));

describe("deploy/prod/check-env.sh", () => {
  it("distinguishes set, empty, and absent values without splitting spaces", () => {
    const output = execFileSync("bash", [path.join(root, "deploy/prod/check-env.sh")], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ""}` },
    });

    expect(output).toMatch(/^  DATABASE_URL\s+set \(3 chars\)$/m);
    expect(output).toMatch(/^  SMTP_HOST\s+EMPTY$/m);
    expect(output).toMatch(/^  SMTP_FROM_NAME\s+set \(16 chars\)$/m);
    expect(output).toMatch(/^  TELEGRAM_WEBHOOK_SECRET\s+NOT SET$/m);
    expect(output).toContain("variables are not set in the container; EMPTY: 1.");
  });
});

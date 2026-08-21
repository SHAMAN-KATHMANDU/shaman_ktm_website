// setup-nginx.sh must handle THREE states of /etc/nginx/sites-enabled/<site>.conf,
// not two: absent, already-a-symlink, and "a regular file is sitting there".
//
// The original guard was `if [[ ! -L "$NGINX_ENABLED" ]]; then ln -s ...`,
// which lumps the third state in with the first. `ln -s` without -f then fails
// with "File exists", and because the script runs under `set -euo pipefail`
// that aborts it AFTER the copy to sites-available has already succeeded — so
// sites-available gets the new config, sites-enabled keeps the old one, and
// `nginx -t` / reload never run.
//
// That is the exact state production is in: on the live host
// sites-enabled/shamanktmweb.conf is a regular file dated 2026-05-03 while
// sites-available is dated 2026-07-08 and differs. Every run since has been
// updating a file nginx does not read.
//
// These tests run the real enable block extracted from the real script, so
// they cannot drift from it the way a hand-copied snippet would.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, symlinkSync, lstatSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

/**
 * Pull the enable block straight out of deploy/prod/setup-nginx.sh so the test
 * exercises the shipped code rather than a copy of it.
 */
function enableBlock(): string {
  const src = readFileSync(path.join(root, "deploy/prod/setup-nginx.sh"), "utf8");
  // The region now spans two guards with the config-source choice and the copy
  // between them: the refusal comes FIRST (so a refused run writes nothing),
  // then the source selection, then the symlink. Extract the whole region so
  // the ordering itself is under test — taking only the symlink block would
  // silently stop covering the refusal, which is the branch that matters.
  const start = src.indexOf('if [[ -e "$NGINX_ENABLED" && ! -L "$NGINX_ENABLED" ]]; then');
  expect(
    start,
    "setup-nginx.sh no longer contains the refusal guard — update this test with it",
  ).toBeGreaterThan(-1);
  const symlink = src.indexOf('if [[ -L "$NGINX_ENABLED" ]]; then', start);
  expect(
    symlink,
    "setup-nginx.sh no longer contains the symlink block after the refusal",
  ).toBeGreaterThan(start);
  const end = src.indexOf("\nfi\n", symlink);
  expect(end).toBeGreaterThan(symlink);
  return src.slice(start, end + 4);
}

let dir: string;
let available: string;
let enabled: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "nginx-enable-"));
  mkdirSync(path.join(dir, "available"));
  mkdirSync(path.join(dir, "enabled"));
  available = path.join(dir, "available", "site.conf");
  enabled = path.join(dir, "enabled", "site.conf");
  writeFileSync(available, "NEW CONFIG\n");
  mkdirSync(path.join(dir, "src"));
  // No /etc/letsencrypt/live/www.example.invalid exists, so the script selects
  // the bootstrap config — that is the branch these tests exercise.
  writeFileSync(path.join(dir, "src", "nginx.conf"), "TLS CONFIG\n");
  writeFileSync(path.join(dir, "src", "nginx-bootstrap.conf"), "BOOTSTRAP CONFIG\n");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Run the shipped block with the same shell options the real script uses. */
function runEnable(): { status: number; output: string } {
  const script = [
    "set -euo pipefail",
    "error()   { echo \"[ERROR] $*\" >&2; }",
    "success() { echo \"[OK] $*\"; }",
    "info()    { echo \"[INFO] $*\"; }",
    "warn()    { echo \"[WARN] $*\"; }",
    `NGINX_AVAILABLE=${JSON.stringify(available)}`,
    `NGINX_ENABLED=${JSON.stringify(enabled)}`,
    // The region copies from ${SCRIPT_DIR}; point it at a fixture dir holding
    // both candidate configs so the copy is real and observable.
    `SCRIPT_DIR=${JSON.stringify(path.join(dir, "src"))}`,
    "WWW_DOMAIN=www.example.invalid",
    enableBlock(),
  ].join("\n");
  try {
    const out = execFileSync("bash", ["-c", script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, output: out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

describe("setup-nginx.sh enable step", () => {
  it("creates the symlink when nothing is there", () => {
    const { status } = runEnable();
    expect(status).toBe(0);
    expect(lstatSync(enabled).isSymbolicLink()).toBe(true);
    // The region copies the chosen source into sites-available first, so what
    // the new symlink resolves to is that source — not the fixture placeholder.
    expect(readFileSync(enabled, "utf8")).toBe("BOOTSTRAP CONFIG\n");
  });

  it("is idempotent when the symlink already exists", () => {
    symlinkSync(available, enabled);
    const { status } = runEnable();
    expect(status).toBe(0);
    expect(lstatSync(enabled).isSymbolicLink()).toBe(true);
  });

  it("repoints a symlink that aims somewhere else", () => {
    const stray = path.join(dir, "available", "other.conf");
    writeFileSync(stray, "SOMEWHERE ELSE\n");
    symlinkSync(stray, enabled);
    expect(runEnable().status).toBe(0);
    expect(readFileSync(enabled, "utf8")).toBe("BOOTSTRAP CONFIG\n");
  });

  // The production case, and the one the old guard got wrong.
  it("REFUSES loudly when a regular file occupies the symlink's place", () => {
    writeFileSync(enabled, "STALE LIVE CONFIG\n");
    const { status, output } = runEnable();

    // Loud: a non-zero exit the operator cannot miss...
    expect(status).not.toBe(0);
    // ...saying WHY, not just "File exists".
    expect(output).toContain("regular file");
    expect(output).toContain("cannot take effect");
    // ...and, the property this ordering exists for: it refused BEFORE writing.
    // sites-available must still hold what it held when the script started.
    expect(readFileSync(available, "utf8")).toBe("NEW CONFIG\n");
    expect(output).toContain("NOTHING HAS BEEN CHANGED");
    // ...and how to look before leaping.
    expect(output).toContain("diff");

    // Not fatal to the server: the live config is left exactly as it was.
    // Silently replacing it would apply every pending difference at once, on
    // production — that is a decision, not a cleanup.
    expect(readFileSync(enabled, "utf8")).toBe("STALE LIVE CONFIG\n");
    expect(lstatSync(enabled).isSymbolicLink()).toBe(false);
  });
});

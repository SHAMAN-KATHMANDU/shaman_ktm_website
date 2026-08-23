// Every environment variable the app reads must be passed through to the
// container — or be explicitly, and justifiably, exempt.
//
// WHY THIS TEST EXISTS
// lib/env.ts declares the full set of variables the server reads. Every one of
// them is optional-with-a-default or degrades quietly when absent: no SMTP_HOST
// means email is dropped to a console line, no META_CAPI_ACCESS_TOKEN means
// server-side conversion events are never sent, an empty TELEGRAM token means
// the bot simply never answers. None of those raise an error, so a variable
// that never reaches the container looks *exactly* like a feature nobody is
// using yet.
//
// That is not hypothetical: production was verified on 2026-08-21 to be running
// with all six SMTP_*, all three META_* and all three TELEGRAM_* variables
// unset inside the container, months after the features that read them shipped.
//
// WHAT THIS TEST DOES NOT DO
// It checks the compose file IN THIS REPO. The deployed file lives on the host
// at /opt/shaman_web/docker-compose.yml and is maintained by hand — a green
// test here says the template is correct, NOT that production is. Use
// deploy/prod/check-env.sh against the running container for that.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

/** Top-level keys of the Zod schema in lib/env.ts. */
function envSchemaKeys(): string[] {
  const src = readFileSync(path.join(root, "lib/env.ts"), "utf8");
  const start = src.indexOf("const Schema = z.object({");
  expect(start, "lib/env.ts no longer declares `const Schema = z.object({`").toBeGreaterThan(-1);
  const body = src.slice(start);
  const end = body.indexOf("\n});");
  expect(end, "could not find the end of the Schema object").toBeGreaterThan(-1);
  return [...body.slice(0, end).matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map((m) => m[1]);
}

/** Keys of the `environment:` block of the `app:` service in docker-compose.yml. */
function composeAppEnvKeys(): string[] {
  const src = readFileSync(path.join(root, "docker-compose.yml"), "utf8");
  const lines = src.split("\n");
  const appAt = lines.findIndex((l) => l === "  app:");
  expect(appAt, "docker-compose.yml has no `app:` service at two-space indent").toBeGreaterThan(-1);
  const envAt = lines.findIndex((l, i) => i > appAt && l === "    environment:");
  expect(envAt, "the `app:` service has no `environment:` block").toBeGreaterThan(-1);
  const keys: string[] = [];
  for (let i = envAt + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || line.startsWith("      #")) continue;
    if (!line.startsWith("      ")) break; // dedented out of the block
    const m = /^ {6}([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
    if (m) keys.push(m[1]);
  }
  return keys;
}

/**
 * Variables deliberately NOT passed at runtime. Each entry must carry a reason
 * a reviewer can check — the point of the list is to make every omission a
 * decision somebody made, rather than one nobody noticed.
 */
const EXEMPT: Record<string, string> = {
  NODE_ENV: "set by the image itself (Dockerfile: ENV NODE_ENV=production)",
  NEXT_PUBLIC_PROJECTX_API_BASE:
    "build-time ARG, inlined into the client bundle by the Dockerfile — a runtime value would never reach the browser",
  NEXT_PUBLIC_PROJECTX_ORIGIN:
    "build-time ARG, inlined into the client bundle by the Dockerfile — a runtime value would never reach the browser",
  NEXT_PUBLIC_PROJECTX_API_KEY:
    "client-side only and unused by the server; passing it at runtime would have no effect",
};

describe("docker-compose passes through every variable the app reads", () => {
  const schemaKeys = envSchemaKeys();
  const composeKeys = composeAppEnvKeys();

  // Without these three, a parser that quietly matched nothing would make
  // every assertion below vacuously true.
  it("actually parsed both files", () => {
    expect(schemaKeys.length).toBeGreaterThan(20);
    expect(composeKeys.length).toBeGreaterThan(10);
    expect(schemaKeys).toContain("SMTP_HOST");
    expect(composeKeys).toContain("SESSION_PASSWORD");
  });

  it("leaves no variable silently unpassed", () => {
    const missing = schemaKeys.filter((k) => !composeKeys.includes(k) && !(k in EXEMPT));
    expect(
      missing,
      `these variables are read by lib/env.ts but never reach the container — add them to the app service's environment: block, or add them to EXEMPT with a reason:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  // deploy/prod/check-env.sh is the only thing that can detect the host copy
  // drifting from this repo, so it is worthless the moment its own list goes
  // stale. Pin it to the same source of truth.
  it("keeps deploy/prod/check-env.sh in step with the schema", () => {
    const sh = readFileSync(path.join(root, "deploy/prod/check-env.sh"), "utf8");
    const block = /\nVARS="\n([\s\S]*?)\n"\n/.exec(sh);
    expect(block, "check-env.sh no longer declares a VARS=\"...\" block").not.toBeNull();
    const listed = block![1].split("\n").map((l) => l.trim()).filter(Boolean);
    expect(listed.length).toBeGreaterThan(20);
    const expected = schemaKeys.filter((k) => !(k in EXEMPT));
    expect(
      expected.filter((k) => !listed.includes(k)),
      "variables in lib/env.ts that check-env.sh would not report on",
    ).toEqual([]);
    expect(
      listed.filter((k) => !schemaKeys.includes(k)),
      "variables check-env.sh reports on that lib/env.ts no longer declares",
    ).toEqual([]);
  });

  it("keeps the exemption list honest — no stale entries", () => {
    const stale = Object.keys(EXEMPT).filter((k) => !schemaKeys.includes(k));
    expect(stale, `EXEMPT names variables lib/env.ts no longer declares: ${stale.join(", ")}`).toEqual(
      [],
    );
    const contradictory = Object.keys(EXEMPT).filter((k) => composeKeys.includes(k));
    expect(
      contradictory,
      `EXEMPT says these are deliberately not passed, but compose passes them: ${contradictory.join(", ")}`,
    ).toEqual([]);
  });
});

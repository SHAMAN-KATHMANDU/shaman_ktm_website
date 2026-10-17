// Every /api/upload route must resolve the session first via resolveSessionForRoute.
// This is a lint test that reads the route files, not a mock.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "app/api/upload";

interface Handler {
  route: string;
  method: string;
  hasSessionResolution: boolean;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) out.push(...walk(p));
      else if (entry === "route.ts") out.push(p);
    }
  } catch {
    // Directory doesn't exist yet
  }
  return out;
}

/** Every exported handler and whether it calls resolveSessionForRoute. */
function handlers(): Handler[] {
  const found: Handler[] = [];
  for (const file of walk(ROOT)) {
    const route = file.slice(ROOT.length + 1).replace(/\/route\.ts$/, "");
    const src = readFileSync(file, "utf8");
    let current: string | null = null;
    let hasSessionResolution = false;

    for (const line of src.split("\n")) {
      const m = /export async function (GET|POST|PATCH|PUT|DELETE)/.exec(line);
      if (m) {
        current = m[1];
        hasSessionResolution = false;
        found.push({ route, method: m[1], hasSessionResolution: false });
      }

      // Check for resolveSessionForRoute call
      if (/resolveSessionForRoute/.test(line)) {
        hasSessionResolution = true;
        const last = found[found.length - 1];
        if (last && last.method === current && !last.hasSessionResolution) {
          last.hasSessionResolution = true;
        }
      }
    }
  }
  return found;
}

describe("upload route guards", () => {
  const all = handlers();

  it("finds the routes at all (guards against a silently empty sweep)", () => {
    // Should find at least: route.ts, sign/route.ts, confirm/route.ts, variants/route.ts, submit/route.ts, slots/route.ts, slots/[slotId]/route.ts
    expect(all.length).toBeGreaterThanOrEqual(7);
  });

  it("every upload handler calls resolveSessionForRoute", () => {
    const ungated = all.filter((h) => !h.hasSessionResolution);
    expect(
      ungated.map((h) => `${h.method} ${h.route}`),
      "every upload handler must call resolveSessionForRoute",
    ).toEqual([]);
  });
});

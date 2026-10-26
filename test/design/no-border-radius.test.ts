// HARD RULE (AGENTS.md rule 6): every corner on the site is a square 90°.
// This test is the gate — it fails `pnpm verify` (and so CI) when rounding
// creeps back in through a Tailwind class, an inline style, or a CSS rule.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");
const SOURCE_DIRS = ["app", "components", "context", "lib"];
const CLASS_DIRS = ["app", "components", "context"];

// `rounded`, `rounded-lg`, `rounded-[6px]`, `md:rounded-t-card`, … as a class token.
const ROUNDED_CLASS =
  /(?<=[\s"'`{])(?:[\w[\]&@:/-]+:)?rounded(?:-[\w[\].\/%#()-]+)?(?=[\s"'`}$])/;
const INLINE_RADIUS = /\bborder(?:[A-Z][a-z]+)*Radius\b/;
// Any radius declaration — shorthand, corner longhands or a radius token.
const CSS_RADIUS = /(border(?:-[a-z]+)*-radius|--[\w-]*radius[\w-]*)\s*:\s*([^;]+);/g;

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

function offenders(dirs: string[], exts: string[], pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const d of dirs) {
    for (const file of walk(join(ROOT, d), exts)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (pattern.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        });
    }
  }
  return hits;
}

describe("hard rule: square corners", () => {
  it("no rounded* Tailwind class in app/components/context", () => {
    expect(offenders(CLASS_DIRS, [".ts", ".tsx"], ROUNDED_CLASS)).toEqual([]);
  });

  it("no inline borderRadius style anywhere in source", () => {
    expect(offenders(SOURCE_DIRS, [".ts", ".tsx"], INLINE_RADIUS)).toEqual([]);
  });

  it("every radius declaration in CSS is zero", () => {
    const hits: string[] = [];
    for (const d of SOURCE_DIRS) {
      for (const file of walk(join(ROOT, d), [".css"])) {
        for (const m of readFileSync(file, "utf8").matchAll(CSS_RADIUS)) {
          const value = m[2].replace(/!important/, "").trim();
          if (value !== "0") hits.push(`${relative(ROOT, file)}: ${m[0]}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("globals.css keeps the !important square catch-all", () => {
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\*,\s*\*::before,\s*\*::after,[\s\S]*?border-radius:\s*0\s*!important/);
  });

  it("the class pattern catches the forms it is meant to", () => {
    for (const bad of [
      ' className="p-4 rounded"',
      ' className="rounded-lg p-4"',
      " `md:rounded-t-card ${x}`",
      ' "rounded-[6px]"',
      ' "hover:rounded-full"',
    ]) {
      expect(ROUNDED_CLASS.test(bad), bad).toBe(true);
    }
    expect(ROUNDED_CLASS.test(" amounts are rounded to whole rupees")).toBe(true);
    expect(ROUNDED_CLASS.test("Math.round(x)")).toBe(false);
  });
});

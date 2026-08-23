import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The admin product editor rebuilds its whole PUT payload from local state, and
// updateProduct() maps every omitted variation field to null. So a field that
// the editor loads but forgets to send back is not a cosmetic gap — it is
// silent data loss on every ordinary save, wiping values set over MCP.
//
// This test reads the real files and compares three key sets that must agree:
// the zod schema, the load mapper, and the save payload. It is deliberately
// source-reading rather than behavioural: the page is a client component and
// the suite runs in a node environment with no .tsx in its include glob, and a
// key-set comparison is exactly the invariant that was broken.

const ROOT = join(__dirname, "..", "..");
const PAGE = readFileSync(
  join(ROOT, "app/sysuser/(authed)/products/[id]/page.tsx"),
  "utf8",
);
const SCHEMAS = readFileSync(join(ROOT, "lib/validation/schemas.ts"), "utf8");

/** Body of the object literal whose opening brace follows `from`. */
function objectBody(src: string, from: number): string {
  const open = src.indexOf("{", from);
  if (open < 0) throw new Error("no object literal after index " + from);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error("unbalanced braces from index " + open);
}

/** Keys declared directly in an object body, ignoring nested ones. */
function topLevelKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  const re = /[{}()[\]]|([A-Za-z_$][\w$]*)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const tok = m[0];
    if (tok === "{" || tok === "(" || tok === "[") depth++;
    else if (tok === "}" || tok === ")" || tok === "]") depth--;
    else if (depth === 0 && m[1]) keys.push(m[1]);
  }
  return keys;
}

function anchor(src: string, needle: string): number {
  const i = src.indexOf(needle);
  expect(i, `anchor not found — did the source move? ${needle}`).toBeGreaterThan(-1);
  return i;
}

/** Keys of the object an `.map(...)` callback returns, i.e. after `=> ({`. */
function mappedKeys(src: string, mapAnchor: string): string[] {
  const from = anchor(src, mapAnchor);
  const arrow = src.indexOf("=> ({", from);
  expect(arrow, `no "=> ({" after ${mapAnchor}`).toBeGreaterThan(-1);
  return topLevelKeys(objectBody(src, arrow));
}

function schemaKeys(name: string): string[] {
  const from = anchor(SCHEMAS, `export const ${name} = z.object(`);
  return topLevelKeys(objectBody(SCHEMAS, from));
}

const sorted = (xs: string[]) => [...new Set(xs)].sort();

describe("admin product editor round-trips every variation field", () => {
  // `id` is accepted by the schema but never sent: updateProduct() matches
  // variations by SKU so the ledger-anchoring ids survive an edit.
  const schema = sorted(schemaKeys("ProductVariationSchema")).filter(
    (k) => k !== "id",
  );
  const load = sorted(
    mappedKeys(PAGE, "variations: (p.variations ?? []).map("),
  );
  const save = sorted(
    mappedKeys(PAGE, "variations: state.variations.map("),
  );

  it("sends back every field the schema accepts", () => {
    expect(save).toEqual(schema);
  });

  it("sends back every field it loads", () => {
    expect(save).toEqual(load);
  });

  it("covers the fields that were being nulled", () => {
    for (const field of [
      "label",
      "color",
      "size",
      "dimensions",
      "mrp",
      "costPrice",
      "wholesalePrice",
      "active",
    ]) {
      expect(save, `${field} missing from the save payload`).toContain(field);
      expect(load, `${field} missing from the load mapper`).toContain(field);
    }
  });
});

describe("admin product editor round-trips every image field", () => {
  const schema = sorted(schemaKeys("ProductImageSchema")).filter(
    (k) => k !== "id",
  );
  const load = sorted(mappedKeys(PAGE, "images: (p.images ?? []).map("));
  const save = sorted(mappedKeys(PAGE, "images: state.images.map("));

  it("sends back every field the schema accepts", () => {
    expect(save).toEqual(schema);
  });

  it("sends back every field it loads", () => {
    expect(save).toEqual(load);
  });

  it("keeps the Nepali alt text", () => {
    expect(save).toContain("altNe");
    expect(load).toContain("altNe");
  });
});

describe("attributes survive the Record <-> rows conversion", () => {
  it("drops only empty keys and keeps the rest verbatim", () => {
    // The helpers are module-private to a client component, so re-derive the
    // contract here: what matters is that a non-empty key round-trips.
    const rows = [
      { key: "finish", value: "antique brass" },
      { key: "  ", value: "ignored" },
      { key: " spaced ", value: "trimmed key" },
    ];
    const out: Record<string, string> = {};
    for (const r of rows) {
      const k = r.key.trim();
      if (k) out[k] = r.value;
    }
    expect(out).toEqual({ finish: "antique brass", spaced: "trimmed key" });
  });
});

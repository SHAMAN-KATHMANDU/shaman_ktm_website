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

/**
 * Remove comments, so prose can never be mistaken for code.
 *
 * This is not tidiness. The scanners below look for `identifier:` and count
 * braces, and both are blind to context — so a comment reading
 * "Two reasons, both structural: ..." registered `structural` as a schema key
 * and failed this test, and an unbalanced `{` in a comment would silently
 * mis-slice an object body. The offending comment was correct English about
 * correct code; the reader was what was wrong.
 *
 * String and template literals are preserved verbatim, and so are regex
 * literals — `lib/validation/schemas.ts` contains `/^https?:\/\//i`, which a
 * stripper that only knew about strings would read as the start of a comment
 * and delete the rest of the line, quietly changing the very schema this test
 * checks. Division is told apart from a regex by the previous significant
 * character, the usual lexical heuristic.
 */
export function stripComments(src: string): string {
  let out = "";
  let prev = ""; // last significant char emitted, for regex-vs-division
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < src.length) {
        out += src[i];
        if (src[i] === "\\") {
          i++;
          if (i < src.length) out += src[i];
          i++;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      prev = quote;
      continue;
    }
    if (c === "/" && /[(,=:[!&|?{};+\-*%^~]/.test(prev)) {
      // Regex literal: copy it whole, including any escaped slashes.
      out += c;
      i++;
      let inClass = false;
      while (i < src.length) {
        out += src[i];
        if (src[i] === "\\") {
          i++;
          if (i < src.length) out += src[i];
          i++;
          continue;
        }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) {
          i++;
          break;
        }
        i++;
      }
      while (i < src.length && /[a-z]/.test(src[i])) {
        out += src[i];
        i++;
      }
      prev = "/";
      continue;
    }
    out += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

const PAGE = stripComments(
  readFileSync(join(ROOT, "app/sysuser/(authed)/products/[id]/page.tsx"), "utf8"),
);
const SCHEMAS = stripComments(
  readFileSync(join(ROOT, "lib/validation/schemas.ts"), "utf8"),
);

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
  // Stable ids are sent so a SKU rename updates the ledger-anchored row. The
  // two stock projections are deliberately display-only and never writable.
  const schema = sorted(schemaKeys("ProductVariationSchema"));
  const load = sorted(
    mappedKeys(PAGE, "variations: (p.variations ?? []).map("),
  ).filter((k) => k !== "aggregateStock" && k !== "onlineStock");
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

// The scanners above read source as text, so they can be fooled by text. These
// pin the two ways that actually happened or nearly happened, so the next
// person to write an ordinary English comment does not fail an unrelated test
// and spend an afternoon finding out why.
describe("the source scanner is not fooled by prose", () => {
  it("does not read a word before a colon in a comment as a key", () => {
    // This is the exact shape that broke it: a comment inside a schema body
    // whose prose contains `word:`.
    const src = stripComments(`z.object({
      url: pathOrAbsoluteUrl,
      // Two reasons, both structural: image rows are recreated on every save.
      variationSku: z.string().optional(),
    })`);
    expect(topLevelKeys(objectBody(src, 0))).toEqual(["url", "variationSku"]);
  });

  it("does not let a brace inside a comment mis-slice an object body", () => {
    // lib/validation/schemas.ts really does contain `// {productName} and
    // {productUrl} are interpolated.` — balanced today, which is luck, not a
    // guarantee.
    const src = `const x = z.object({
      subject: z.string(), // an unbalanced { in prose
      body: z.string(),
    });`;
    expect(topLevelKeys(objectBody(stripComments(src), 0))).toEqual([
      "subject",
      "body",
    ]);
  });

  it("keeps regex literals whole, including escaped slashes", () => {
    // schemas.ts line ~22 is `/^https?:\/\//i.test(v)`. A stripper that knew
    // only about strings would see `//` there, delete the rest of the line,
    // and silently change the schema this file exists to check.
    const src = `const isAbsolute = /^https?:\\/\\//i.test(v); // trailing comment`;
    const out = stripComments(src);
    expect(out).toContain("/^https?:\\/\\//i.test(v)");
    expect(out).not.toContain("trailing comment");
  });

  it("keeps a // that lives inside a string literal", () => {
    const src = `const base = "https://example.com/x"; // comment`;
    const out = stripComments(src);
    expect(out).toContain('"https://example.com/x"');
    expect(out).not.toContain("comment");
  });

  it("strips block comments without eating code around them", () => {
    const src = `x({ a: 1, /* b: 2, */ c: 3 })`;
    expect(topLevelKeys(objectBody(stripComments(src), 0))).toEqual(["a", "c"]);
  });

  it("still finds the real schema keys after stripping", () => {
    // Guards the stripper itself: if it corrupted SCHEMAS, this collapses.
    expect(schemaKeys("ProductImageSchema")).toContain("url");
    expect(schemaKeys("ProductImageSchema")).toContain("variationSku");
    expect(schemaKeys("ProductImageSchema")).not.toContain("structural");
  });
});

// Translation coverage audit. Reports, per content model, how much of the
// translatable text has a Nepali (`<field>Ne`) value, and an overall field
// coverage %. Exits non-zero when below I18N_MIN_COVERAGE (default 0, so it's
// informational until the team chooses to enforce a floor).
//
//   pnpm i18n:audit                 # report only
//   I18N_MIN_COVERAGE=80 pnpm i18n:audit   # fail under 80%
//
// Needs DATABASE_URL. Run against a live/seeded DB (local or prod replica).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Each model + the English fields that should carry a `<field>Ne` translation.
const MODELS: { name: string; delegate: string; fields: string[] }[] = [
  { name: "Element", delegate: "element", fields: ["name", "natureSource", "energyDescription"] },
  { name: "Category", delegate: "category", fields: ["name"] },
  { name: "Product", delegate: "product", fields: ["name", "description"] },
  { name: "Bundle", delegate: "bundle", fields: ["title", "description"] },
  { name: "Collection", delegate: "collection", fields: ["title", "subtitle"] },
  { name: "BlogPost", delegate: "blogPost", fields: ["title", "excerpt", "bodyMarkdown"] },
  { name: "BlogCategory", delegate: "blogCategory", fields: ["name", "description"] },
  { name: "Page", delegate: "page", fields: ["title", "bodyMarkdown"] },
  { name: "Service", delegate: "service", fields: ["name", "summary"] },
  { name: "Showroom", delegate: "showroom", fields: ["name", "address"] },
  { name: "Announcement", delegate: "announcement", fields: ["message"] },
];

function nonEmpty(v: unknown): boolean {
  return typeof v === "string" && v.trim() !== "";
}

async function main() {
  const minCoverage = Number(process.env.I18N_MIN_COVERAGE ?? "0");

  let grandRequired = 0;
  let grandTranslated = 0;
  const rowsOut: string[] = [];

  for (const m of MODELS) {
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await (prisma as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]> }>)[
        m.delegate
      ].findMany();
    } catch (e) {
      rowsOut.push(`  ${m.name.padEnd(14)} (skipped: ${(e as Error).message.split("\n")[0]})`);
      continue;
    }

    let required = 0;
    let translated = 0;
    let fullyTranslated = 0;
    for (const row of rows) {
      let rowReq = 0;
      let rowTrans = 0;
      for (const f of m.fields) {
        if (nonEmpty(row[f])) {
          rowReq++;
          if (nonEmpty(row[`${f}Ne`])) rowTrans++;
        }
      }
      required += rowReq;
      translated += rowTrans;
      if (rowReq > 0 && rowTrans === rowReq) fullyTranslated++;
    }

    grandRequired += required;
    grandTranslated += translated;
    const pct = required ? Math.round((translated / required) * 100) : 100;
    rowsOut.push(
      `  ${m.name.padEnd(14)} ${String(rows.length).padStart(4)} rows   ` +
        `${String(fullyTranslated).padStart(4)} fully   ${String(pct).padStart(3)}% of fields`,
    );
  }

  const overall = grandRequired ? Math.round((grandTranslated / grandRequired) * 100) : 100;

  console.log("\n  Nepali translation coverage");
  console.log("  " + "─".repeat(48));
  console.log(rowsOut.join("\n"));
  console.log("  " + "─".repeat(48));
  console.log(
    `  OVERALL  ${overall}% of translatable fields (${grandTranslated}/${grandRequired})`,
  );
  console.log(`  Threshold: ${minCoverage}%\n`);

  await prisma.$disconnect();

  if (overall < minCoverage) {
    console.error(`❌ Coverage ${overall}% is below the ${minCoverage}% threshold.`);
    process.exit(1);
  }
  console.log("✓ Coverage meets the configured threshold.");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

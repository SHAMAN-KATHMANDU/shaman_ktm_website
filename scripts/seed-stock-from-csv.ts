// One-shot launch-stock import (spec decision #14: launch seed = stock only).
//
// Reads data/stock-master.csv — the master-stock sheet AFTER the manual
// decomposition to variation grain (data prerequisite #2) — and writes one
// `initial_seed` movement per (variation, showroom) through the ledger's
// single write path, which also materializes StockLevel and
// ProductVariation.stock.
//
// CSV contract (header row required, no quoted commas):
//   legacyImsCode,variationSku,showroomKey,qty
//     legacyImsCode → Product.legacyImsCode (the 575-code IMS join key)
//     variationSku  → ProductVariation.sku within that product
//     showroomKey   → Showroom.key (e.g. thamel, gongabu)
//     qty           → non-negative integer (0 rows are skipped)
//
// Idempotent: a (variation, showroom) that already has an initial_seed
// movement is skipped, so RUN_DB_SEED=1 + SEED_STOCK=1 on a redeploy cannot
// double-seed. Unresolvable rows are reported and skipped, never guessed.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/db";
import { recordStockMovement } from "../lib/stock";

const CSV_PATH = join(process.cwd(), "data", "stock-master.csv");

interface CsvRow {
  line: number;
  legacyImsCode: string;
  variationSku: string;
  showroomKey: string;
  qty: number;
}

function parseCsv(raw: string): { rows: CsvRow[]; badLines: string[] } {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0]?.trim().toLowerCase();
  if (header !== "legacyimscode,variationsku,showroomkey,qty") {
    throw new Error(
      `data/stock-master.csv: unexpected header "${lines[0]}" — expected "legacyImsCode,variationSku,showroomKey,qty"`,
    );
  }
  const rows: CsvRow[] = [];
  const badLines: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const qty = Number(parts[3]);
    if (parts.length !== 4 || !parts[0] || !parts[1] || !parts[2]) {
      badLines.push(`line ${i + 1}: malformed row "${lines[i]}"`);
      continue;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      badLines.push(`line ${i + 1}: bad qty "${parts[3]}"`);
      continue;
    }
    rows.push({
      line: i + 1,
      legacyImsCode: parts[0],
      variationSku: parts[1],
      showroomKey: parts[2],
      qty,
    });
  }
  return { rows, badLines };
}

export async function seedStockFromCsv() {
  if (!existsSync(CSV_PATH)) {
    console.log(
      "· stock seed: data/stock-master.csv not present — skipping (add the decomposed master-stock CSV to run the launch import)",
    );
    return;
  }
  const { rows, badLines } = parseCsv(readFileSync(CSV_PATH, "utf8"));
  let seeded = 0;
  let skippedExisting = 0;
  const unresolved: string[] = [...badLines];

  for (const row of rows) {
    if (row.qty === 0) continue;
    const product = await prisma.product.findUnique({
      where: { legacyImsCode: row.legacyImsCode },
      select: { id: true },
    });
    if (!product) {
      unresolved.push(
        `line ${row.line}: no product with legacyImsCode "${row.legacyImsCode}"`,
      );
      continue;
    }
    const variation = await prisma.productVariation.findFirst({
      where: { productId: product.id, sku: row.variationSku },
      select: { id: true },
    });
    if (!variation) {
      unresolved.push(
        `line ${row.line}: product "${row.legacyImsCode}" has no variation with sku "${row.variationSku}"`,
      );
      continue;
    }
    const already = await prisma.stockMovement.findFirst({
      where: {
        variationId: variation.id,
        showroomKey: row.showroomKey,
        reason: "initial_seed",
      },
      select: { id: true },
    });
    if (already) {
      skippedExisting++;
      continue;
    }
    await recordStockMovement({
      variationId: variation.id,
      showroomKey: row.showroomKey,
      delta: row.qty,
      reason: "initial_seed",
      note: `Launch stock import (csv line ${row.line})`,
    });
    seeded++;
  }

  console.log(
    `✓ stock seed: ${seeded} pools seeded, ${skippedExisting} already seeded, ${unresolved.length} unresolved`,
  );
  if (unresolved.length) {
    console.log("  Unresolved rows (fix the CSV or the catalog, then re-run):");
    for (const u of unresolved.slice(0, 50)) console.log(`  - ${u}`);
    if (unresolved.length > 50) {
      console.log(`  … and ${unresolved.length - 50} more`);
    }
  }
}

// Allow standalone execution: pnpm tsx scripts/seed-stock-from-csv.ts
if (require.main === module) {
  seedStockFromCsv()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

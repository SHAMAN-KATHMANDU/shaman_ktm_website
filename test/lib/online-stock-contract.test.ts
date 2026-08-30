import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ONLINE_POOL_KEY,
  onlineStockOf,
} from "@/lib/stock/constants";

function source(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Online stock contract", () => {
  it("treats a missing Online level as zero rather than copying aggregate stock", () => {
    expect(onlineStockOf({ stockLevels: [] })).toBe(0);
    expect(onlineStockOf({ stockLevels: [{ qty: 6 }] })).toBe(6);
    expect(ONLINE_POOL_KEY).toBe("online");
  });

  it("migrates the pre-ledger aggregate into an inventory-only Online pool", () => {
    const sql = source(
      "prisma/migrations/20260830144500_online_stock_pool/migration.sql",
    );
    expect(sql).toContain("'online', 'Online'");
    expect(sql).toContain("'warehouse', true");
    expect(sql).toContain("v.\"stock\"");
    expect(sql).toContain("'initial_seed'");
    expect(sql).toContain('INSERT INTO "StockLevel"');
    expect(sql).toContain('LOCK TABLE "ProductVariation" IN SHARE ROW EXCLUSIVE MODE');
    expect(sql).toContain("requires a globally empty StockLevel ledger");
    expect(sql).toContain("reserved showroom key online exists with an unexpected definition");
    expect(sql).toContain("Do not run it manually while the old app is");
    expect(sql).not.toContain('CASE\n    WHEN EXISTS');
  });

  it("public availability surfaces select the Online relation", () => {
    const dto = source("lib/api/server/dto.ts");
    expect(dto).toContain("stock: onlineStockOf(v)");

    for (const path of [
      "app/api/public/v1/products/route.ts",
      "app/api/public/v1/products/[idOrSlug]/route.ts",
      "app/api/public/v1/homepage/route.ts",
      "app/api/public/v1/offers/route.ts",
      "app/api/public/v1/collections/[slug]/route.ts",
      "lib/api/server/homepage.ts",
      "app/feeds/products/route.ts",
      "app/products/[slug]/page.tsx",
    ]) {
      expect(source(path), path).toContain("ONLINE_STOCK_LEVEL_SELECT");
    }
  });

  it("customer-facing showroom lists exclude inventory-only warehouses", () => {
    for (const path of [
      "app/api/public/v1/showrooms/route.ts",
      "app/api/sysuser/showrooms/route.ts",
      "lib/mcp/tools/showrooms.ts",
      "components/site/home/who-we-are.tsx",
      "lib/telegram/core.ts",
    ]) {
      expect(source(path), path).toContain("PHYSICAL_SHOWROOM_WHERE");
    }
    expect(source("app/sysuser/(authed)/stock/page.tsx")).toContain(
      "/api/sysuser/stock/pools",
    );
  });

  it("checkout and cancellation both use append-only Online movements", () => {
    const orders = source("lib/orders/index.ts");
    expect(orders).toContain("showroomKey: ONLINE_POOL_KEY");
    expect(orders).toContain('reason: "order"');
    expect(orders).toContain('refType: "Order"');
    expect(orders).toContain('refType: "StockMovement"');
    expect(orders).not.toContain("stock: { decrement: row.quantity }");
    expect(orders).not.toContain("stock: { increment: item.quantity }");
  });
});

// GET /api/sysuser/products/export
// Streams an .xlsx of the catalog with each product's primary photo embedded
// inline. Optional query params mirror the admin table filter:
//   q      – case-insensitive name search
//   status – draft | published | archived (omit or "all" for every status)
// With no params the whole catalog is exported.

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // exceljs + image fetch/Buffer need Node, not Edge

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { logAction } from "@/lib/audit";
import { buildProductsWorkbook } from "@/lib/cms/product-export";

const VALID_STATUS = new Set(["draft", "published", "archived"]);

export async function GET(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const statusParam = searchParams.get("status") || undefined;
  const status =
    statusParam && VALID_STATUS.has(statusParam) ? statusParam : undefined;

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    where: {
      ...(status ? { status } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { images: { orderBy: { position: "asc" } }, category: true },
  });

  const workbook = await buildProductsWorkbook(products);
  const buffer = await workbook.xlsx.writeBuffer();

  logAction({
    actor: g.session.email,
    action: "export",
    entity: "Product",
    summary: `Exported ${products.length} product${products.length === 1 ? "" : "s"} to Excel`,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="shaman-products-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

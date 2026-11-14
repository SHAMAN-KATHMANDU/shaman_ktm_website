export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listBlogCategories } from "@/lib/api/server/blog";

export async function GET() {
  return NextResponse.json({ message: "ok", categories: await listBlogCategories() });
}

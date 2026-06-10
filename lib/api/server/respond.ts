import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { adminGuard } from "@/lib/auth/guard";
import type { CacheTag } from "./tags";

export async function parseJson<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<
  { ok: true; data: z.output<S> } | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid JSON" },
        { status: 400 },
      ),
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Validation failed",
          errors: (parsed.error as ZodError).flatten(),
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function adminRoute<T>(
  handler: () => Promise<T>,
): Promise<NextResponse | T> {
  const guard = await adminGuard();
  if (!guard.ok) return guard.response;
  return handler();
}

export function bumpTags(...tags: CacheTag[]): void {
  for (const t of tags) revalidateTag(t, "max");
}

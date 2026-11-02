import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/oauth/rate-limit";
import { hashUploadToken, resolveUploadSession } from "./session";
import type { ResolvedUploadSession } from "./session";

/**
 * Resolve an upload session from a raw token in a route.
 * Handles rate limiting, token hashing, and consistent 404 response.
 * Returns {ok: true, session} or {ok: false, response} for routing.
 */
export async function resolveSessionForRoute(
  req: Request,
  token: string,
): Promise<
  { ok: true; session: ResolvedUploadSession } | { ok: false; response: NextResponse }
> {
  // Rate limit by token hash prefix + IP
  const tokenHash = hashUploadToken(token);
  const ip = clientIp(req);
  const rateLimitKey = `${tokenHash.slice(0, 16)}:${ip}`;
  // Generous: one photo is ~2 calls (sign + confirm) and the page runs three at
  // once, so a big batch from a phone must not trip it. Guessing is already
  // hopeless (256-bit token); this only blunts a leaked link being hammered.
  const allowed = rateLimit(rateLimitKey, 600, 60_000);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 },
      ),
    };
  }

  // Resolve the session
  const session = await resolveUploadSession(token);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "This upload link has expired or is invalid." },
        { status: 404 },
      ),
    };
  }

  return { ok: true, session };
}

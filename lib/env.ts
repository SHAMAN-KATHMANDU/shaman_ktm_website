// Centralised, Zod-validated environment loader. Imported by instrumentation.ts
// at server boot so a missing or malformed env var fails the deploy loud and
// early, rather than silently breaking auth or DB calls at request time.
//
// Edge-safe: only reads process.env and runs Zod (no fs / crypto / etc.) so
// middleware can import it without breaking the Edge bundle.

import { z } from "zod";

const Bool = z
  .union([z.literal("0"), z.literal("1"), z.literal("true"), z.literal("false")])
  .transform((v) => v === "1" || v === "true");

const Schema = z.object({
  // Core
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a postgres:// URL"),

  // Iron-session
  SESSION_PASSWORD: z
    .string()
    .min(32, "SESSION_PASSWORD must be 32+ characters of random data"),

  // First-deploy admin bootstrap
  ADMIN_BOOTSTRAP_EMAIL: z
    .string()
    .email("ADMIN_BOOTSTRAP_EMAIL must be a valid email"),
  ADMIN_BOOTSTRAP_PASSWORD: z
    .string()
    .min(12, "ADMIN_BOOTSTRAP_PASSWORD must be 12+ characters")
    .refine((v) => v.toLowerCase() !== "changeme", {
      message:
        "ADMIN_BOOTSTRAP_PASSWORD must not be the default 'changeme' — set a real value",
    }),

  // S3 / R2
  S3_PUBLIC_BASE: z.string().url("S3_PUBLIC_BASE must be an https:// URL"),
  S3_REGION: z.string().min(1).default("ap-south-1"),
  S3_BUCKET: z.string().min(1).default("ims-shaman-photos"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Public API client
  PROJECTX_API_MODE: z.enum(["live", "mock"]).default("live"),
  NEXT_PUBLIC_PROJECTX_API_BASE: z.string().optional(),
  NEXT_PUBLIC_PROJECTX_API_KEY: z.string().optional(),
  NEXT_PUBLIC_PROJECTX_ORIGIN: z.string().optional(),
  NEXT_PUBLIC_SITE_MODE: z.enum(["live", "coming-soon"]).default("live"),

  // Boot toggles
  RUN_DB_SEED: Bool.default("0"),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Environment validation failed:\n${issues}\nFix the missing/invalid env vars and restart.`,
    );
  }
  cached = parsed.data;
  return cached;
}

// Lazy proxy: code can `import { env } from "@/lib/env"` and read e.g. env.DATABASE_URL.
// First access validates and caches; subsequent reads are free.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env];
  },
});

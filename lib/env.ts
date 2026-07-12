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

  // First-deploy admin bootstrap. Both vars are only consumed by the seed
  // when AdminUser is empty — once an admin exists they're unused, so we
  // accept "" / unset on subsequent deploys. When SET, values must be
  // sound (so a typo'd password doesn't slip into a fresh deploy).
  ADMIN_BOOTSTRAP_EMAIL: z
    .string()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "ADMIN_BOOTSTRAP_EMAIL must be empty or a valid email",
    })
    .optional()
    .default(""),
  ADMIN_BOOTSTRAP_PASSWORD: z
    .string()
    .refine((v) => v === "" || v.length >= 12, {
      message: "ADMIN_BOOTSTRAP_PASSWORD must be empty or 12+ characters",
    })
    .refine((v) => v.toLowerCase() !== "changeme", {
      message:
        "ADMIN_BOOTSTRAP_PASSWORD must not be the default 'changeme' — set a real value or leave unset",
    })
    .optional()
    .default(""),

  // S3 / R2
  S3_PUBLIC_BASE: z.string().url("S3_PUBLIC_BASE must be an https:// URL"),
  S3_REGION: z.string().min(1).default("ap-south-1"),
  S3_BUCKET: z.string().min(1).default("ims-shaman-photos"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // SMTP mailer (customer reset links + order emails). All optional: with no
  // SMTP_HOST the mailer degrades to console logging (dev parity with the
  // admin reset flow's dev-echo).
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM_EMAIL: z
    .string()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "SMTP_FROM_EMAIL must be empty or a valid email",
    })
    .optional()
    .default(""),
  SMTP_FROM_NAME: z.string().optional().default("Shaman Kathmandu"),
  // Absolute origin used in emailed links (falls back to the request origin).
  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  // Public API client
  PROJECTX_API_MODE: z.enum(["live", "mock"]).default("live"),
  NEXT_PUBLIC_PROJECTX_API_BASE: z.string().optional(),
  NEXT_PUBLIC_PROJECTX_API_KEY: z.string().optional(),
  NEXT_PUBLIC_PROJECTX_ORIGIN: z.string().optional(),
  NEXT_PUBLIC_SITE_MODE: z.enum(["live", "coming-soon"]).default("live"),

  // Fonepay web-redirect gateway (lib/payment/fonepay.ts). Sandbox mode falls
  // back to Fonepay's published test merchant when code/secret are unset, so
  // dev boots with no extra config; live mode requires real credentials
  // (enforced in lib/payment at use time, not boot — payments stay optional).
  FONEPAY_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  FONEPAY_MERCHANT_CODE: z.string().optional().default(""),
  FONEPAY_SECRET: z.string().optional().default(""),

  // NCM (Nepal Can Move) courier API (lib/ncm/client.ts). Optional; webhook
  // is closed by default (disabled when NCM_WEBHOOK_SECRET is empty).
  NCM_MODE: z.enum(["demo", "live"]).default("demo"),
  NCM_TOKEN: z.string().optional().default(""),
  NCM_WEBHOOK_SECRET: z.string().optional().default(""),
  NCM_SOURCE_BRANCH: z.string().optional().default("TINKUNE"),

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

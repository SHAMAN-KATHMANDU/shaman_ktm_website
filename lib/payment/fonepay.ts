// Fonepay web-redirect gateway: pure signing/verification helpers, no DB.
// Flow: build a signed URL → customer pays on the Fonepay portal → Fonepay
// redirects the browser back to our return route with signed result params.
//
// Spec notes (confirm against the merchant onboarding PDF; sandbox is the gate):
// - Request DV  = HMAC-SHA512 over "PID,MD,PRN,AMT,CRN,DT,R1,R2,RU" (comma-joined,
//   same order as sent), hex.
// - Return DV   = HMAC-SHA512 over "PRN,PID,PS,RC,UID,BC,INI,P_AMT,R_AMT".
// - AMT is whole NPR rupees for this redirect product (the separate Dynamic QR
//   API takes paisa — do not copy that convention here).
// - DT is MM/DD/YYYY.
// - PRN must be unique per attempt; a retry mints a new PRN, never reuses one.

import crypto from "crypto";
import { env } from "@/lib/env";

const BASE_URLS = {
  sandbox: "https://dev-clientapi.fonepay.com/api/merchantRequest",
  live: "https://clientapi.fonepay.com/api/merchantRequest",
} as const;

// Published Fonepay sandbox credentials (test merchant) — real values come
// from env in live mode.
const SANDBOX_MERCHANT = "NBQM";
const SANDBOX_SECRET = "a7e3512f5032480a83137793cb2021dc";

export interface FonepayConfig {
  merchantCode: string;
  secret: string;
  baseUrl: string;
  mode: "sandbox" | "live";
}

export function fonepayConfig(): FonepayConfig {
  const mode = env.FONEPAY_MODE;
  return {
    mode,
    baseUrl: BASE_URLS[mode],
    merchantCode:
      env.FONEPAY_MERCHANT_CODE || (mode === "sandbox" ? SANDBOX_MERCHANT : ""),
    secret: env.FONEPAY_SECRET || (mode === "sandbox" ? SANDBOX_SECRET : ""),
  };
}

function hmacSha512(message: string, secret: string): string {
  return crypto.createHmac("sha512", secret).update(message).digest("hex");
}

/** MM/DD/YYYY, the DT format Fonepay expects. */
function fonepayDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/** Mint a per-attempt reference: "<orderNumber>-<epochMs>", ≤25 alnum+dash. */
export function mintPrn(orderNumber: string, now: Date = new Date()): string {
  return `${orderNumber}-${now.getTime()}`;
}

export interface BuildRedirectInput {
  /** Whole NPR rupees (order.total). Converted to Fonepay's wire format here only. */
  amountNpr: number;
  prn: string;
  /** Absolute URL Fonepay redirects the browser back to. */
  returnUrl: string;
  /** Short free-text remarks shown on the merchant portal (≤25 chars each). */
  remarks1: string;
  remarks2?: string;
  now?: Date;
  config?: FonepayConfig;
}

export function buildRedirectUrl(input: BuildRedirectInput): string {
  const cfg = input.config ?? fonepayConfig();
  if (!cfg.merchantCode || !cfg.secret) {
    throw new Error(
      "Fonepay is not configured (FONEPAY_MERCHANT_CODE / FONEPAY_SECRET)",
    );
  }
  if (!Number.isInteger(input.amountNpr) || input.amountNpr <= 0) {
    throw new Error("Fonepay amount must be a positive integer (NPR rupees)");
  }

  const fields: [string, string][] = [
    ["PID", cfg.merchantCode],
    ["MD", "P"], // P = payment
    ["PRN", input.prn],
    ["AMT", String(input.amountNpr)],
    ["CRN", "NPR"],
    ["DT", fonepayDate(input.now ?? new Date())],
    ["R1", sanitizeRemark(input.remarks1)],
    ["R2", sanitizeRemark(input.remarks2 || "-")],
    ["RU", input.returnUrl],
  ];
  const dv = hmacSha512(fields.map(([, v]) => v).join(","), cfg.secret);

  const params = new URLSearchParams(fields);
  params.set("DV", dv);
  return `${cfg.baseUrl}?${params.toString()}`;
}

// Fonepay remark fields are short alphanumeric-ish strings; strip commas so
// they can't break the comma-joined signature message.
function sanitizeRemark(value: string): string {
  const cleaned = value.replace(/[,\n\r]/g, " ").trim().slice(0, 25);
  return cleaned || "-";
}

export interface FonepayReturnParams {
  PRN?: string;
  PID?: string;
  PS?: string; // "true" | "false" — payment success flag
  RC?: string; // response code, "successful" on success
  UID?: string; // Fonepay trace id
  BC?: string; // bank code
  INI?: string;
  P_AMT?: string; // paid amount
  R_AMT?: string; // refunded/requested amount
  DV?: string;
}

export interface VerifyResult {
  ok: boolean;
  /** Signature checked out (independent of success/amount). */
  signatureValid: boolean;
  /** Fonepay reported the payment as successful. */
  paymentSucceeded: boolean;
  /** Paid amount matches what we asked for. */
  amountMatches: boolean;
  paidAmountNpr: number | null;
  error?: string;
}

/**
 * Verify the browser-return params against the shared secret and the expected
 * amount. Everything must pass before an order is marked paid: signature,
 * merchant code, PS flag, and amount.
 */
export function verifyReturnParams(
  params: FonepayReturnParams,
  expected: { amountNpr: number },
  config?: FonepayConfig,
): VerifyResult {
  const cfg = config ?? fonepayConfig();
  const fail = (error: string): VerifyResult => ({
    ok: false,
    signatureValid: false,
    paymentSucceeded: false,
    amountMatches: false,
    paidAmountNpr: null,
    error,
  });

  if (!params.DV || !params.PRN) return fail("Missing DV/PRN in return params");
  if (params.PID !== cfg.merchantCode) return fail("Merchant code mismatch");

  const message = [
    params.PRN ?? "",
    params.PID ?? "",
    params.PS ?? "",
    params.RC ?? "",
    params.UID ?? "",
    params.BC ?? "",
    params.INI ?? "",
    params.P_AMT ?? "",
    params.R_AMT ?? "",
  ].join(",");
  const expectedDv = hmacSha512(message, cfg.secret);
  const given = Buffer.from((params.DV || "").toLowerCase(), "utf8");
  const want = Buffer.from(expectedDv.toLowerCase(), "utf8");
  const signatureValid =
    given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!signatureValid) return fail("Signature verification failed");

  const paymentSucceeded =
    (params.PS ?? "").toLowerCase() === "true" &&
    (params.RC ?? "").toLowerCase() !== "failed";

  const paidAmountNpr = params.P_AMT ? Number(params.P_AMT) : null;
  const amountMatches =
    paidAmountNpr !== null &&
    Number.isFinite(paidAmountNpr) &&
    Math.round(paidAmountNpr) === expected.amountNpr;

  return {
    ok: signatureValid && paymentSucceeded && amountMatches,
    signatureValid,
    paymentSucceeded,
    amountMatches,
    paidAmountNpr,
    error: !paymentSucceeded
      ? `Gateway reported failure (PS=${params.PS}, RC=${params.RC})`
      : !amountMatches
        ? `Amount mismatch (paid ${params.P_AMT}, expected ${expected.amountNpr})`
        : undefined,
  };
}

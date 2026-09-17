// Fonepay "Checkout by Fonepay" Intent / Dynamic QR client (node:crypto —
// never import from client components or the Edge middleware bundle;
// lib/env.ts must stay edge-safe, so signing lives here).
//
// Protocol (Checkout Intent Flow doc v1.10 + Postman collection in
// fonepayapidocs/): every request carries a `signature` header =
// Base64(RSA-SHA256(raw request body string)) made with the merchant's PKCS8
// private key, plus an Authorization header — Basic for /login, the Bearer
// accessToken everywhere else. The body string that is signed MUST be the
// exact string sent, so each call stringifies once and reuses that string.
//
// Settlement authority: only thirdPartyDynamicQrGetStatus. The browser
// WebSocket and the client in general only ever *prompt* a server-side status
// check — they never mark anything paid.

import { createPrivateKey, createSign } from "node:crypto";
import { env } from "@/lib/env";

const TIMEOUT_MS = 10_000;
// Fonepay tokens last 3600s; refresh a minute early so an in-flight request
// can't straddle the expiry.
const TOKEN_SLACK_MS = 60_000;
const BANKS_CACHE_MS = 60 * 60 * 1000;

export class FonepayError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "FonepayError";
    this.status = status;
  }
}

export interface BankDetail {
  bankName: string;
  bankCode: string;
  bankIcon: string;
  packageName: string;
  intentScheme: string;
}

export interface IntentQr {
  qrString: string;
  prn: string;
  websocketId: string;
}

export interface FonepayPaymentStatus {
  paymentStatus: "success" | "pending" | "failed";
  fonepayTraceId: string | null;
  /** Whole NPR rupees, parsed from Fonepay's "100.00"-style string. */
  totalTransactionAmount: number | null;
  paymentMessage: string;
  raw: Record<string, unknown>;
}

export function isFonepayConfigured(): boolean {
  return Boolean(
    env.FONEPAY_BASE_URL.trim() &&
      env.FONEPAY_USERNAME.trim() &&
      env.FONEPAY_PASSWORD.trim() &&
      env.FONEPAY_PRIVATE_KEY.trim() &&
      env.FONEPAY_TERMINAL_ID.trim(),
  );
}

/**
 * referenceLabel must be unique per transaction, alphanumeric only and ≤30
 * chars — order numbers contain a dash, so "SK-000042" attempt 2 becomes
 * "SK000042A2".
 */
export function makeReferenceLabel(orderNumber: string, attempt: number): string {
  const base = orderNumber.replace(/[^A-Za-z0-9]/g, "");
  const label = `${base}A${attempt}`;
  if (!/^[A-Za-z0-9]{1,30}$/.test(label)) {
    throw new FonepayError(`Invalid reference label "${label}"`);
  }
  return label;
}

/** Base64(RSA-SHA256(body)) over the exact string that goes on the wire. */
export function signPayload(body: string, privateKeyBase64: string): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64.replace(/\s/g, ""), "base64"),
    format: "der",
    type: "pkcs8",
  });
  return createSign("RSA-SHA256").update(body, "utf8").sign(key, "base64");
}

/** "100.00" | "100" | 100 → 100; anything unparseable → null. */
export function parseNprAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

function apiUrl(path: string): string {
  const base = env.FONEPAY_BASE_URL.trim().replace(/\/$/, "");
  const basePath = env.FONEPAY_BASE_PATH.trim().replace(/\/$/, "");
  return `${base}${basePath}${path}`;
}

async function fonepayFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw new FonepayError(
      `Fonepay request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Token cache ─────────────────────────────────────────────────────────────

let tokenCache: { token: string; expiresAt: number } | null = null;

async function login(): Promise<string> {
  const body = JSON.stringify({
    username: env.FONEPAY_USERNAME,
    password: env.FONEPAY_PASSWORD,
  });
  const basic = Buffer.from(
    `${env.FONEPAY_USERNAME}:${env.FONEPAY_PASSWORD}`,
  ).toString("base64");

  const res = await fonepayFetch(apiUrl("/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
      signature: signPayload(body, env.FONEPAY_PRIVATE_KEY),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FonepayError(
      `Fonepay login failed: HTTP ${res.status} ${text.slice(0, 300)}`,
      res.status,
    );
  }
  const data = (await res.json()) as {
    accessToken?: string;
    expiresIn?: number;
  };
  if (!data.accessToken) {
    throw new FonepayError("Fonepay login response missing accessToken");
  }
  const ttlMs = (data.expiresIn ?? 3600) * 1000;
  tokenCache = {
    token: data.accessToken,
    expiresAt: Date.now() + ttlMs - TOKEN_SLACK_MS,
  };
  return data.accessToken;
}

async function getAccessToken(force = false): Promise<string> {
  if (!force && tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  return login();
}

/** Test hook: drop the cached token/bank list between unit tests. */
export function resetFonepayCaches(): void {
  tokenCache = null;
  banksCache = null;
}

// Signed + Bearer-authed call, with one retry on 401 (stale token).
async function authedRequest(
  path: string,
  init: { method: "GET" | "POST"; body?: string; headers?: Record<string, string> },
): Promise<Response> {
  const attempt = async (force: boolean) => {
    const token = await getAccessToken(force);
    return fonepayFetch(apiUrl(path), {
      method: init.method,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        // The login response's accessToken already carries the "Bearer " prefix.
        Authorization: token,
        ...(init.body
          ? { signature: signPayload(init.body, env.FONEPAY_PRIVATE_KEY) }
          : {}),
        ...init.headers,
      },
      body: init.body,
    });
  };

  let res = await attempt(false);
  if (res.status === 401) res = await attempt(true);
  return res;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function generateIntentQr(input: {
  amount: number;
  billId: string;
  referenceLabel: string;
}): Promise<IntentQr> {
  if (!isFonepayConfigured()) throw new FonepayError("Fonepay is not configured");
  if (!/^[A-Za-z0-9]{1,30}$/.test(input.referenceLabel)) {
    throw new FonepayError(`Invalid reference label "${input.referenceLabel}"`);
  }
  if (
    !Number.isFinite(input.amount) ||
    input.amount < 1 ||
    input.amount > 9_999_999
  ) {
    throw new FonepayError(`Amount out of Fonepay range: ${input.amount}`);
  }

  const body = JSON.stringify({
    amount: input.amount,
    billId: input.billId,
    terminalId: env.FONEPAY_TERMINAL_ID,
    paymentMode: "QR",
    referenceLabel: input.referenceLabel,
    qrType: "INTENT_QR",
  });
  const res = await authedRequest("/generate-intent-qr", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FonepayError(
      `Fonepay QR generation failed: HTTP ${res.status} ${text.slice(0, 300)}`,
      res.status,
    );
  }
  const data = (await res.json()) as {
    qrString?: string;
    qrMessage?: string;
    prn?: string;
    websocketId?: string;
  };
  const qrString = data.qrString || data.qrMessage;
  if (!qrString || !data.websocketId) {
    throw new FonepayError("Fonepay QR response missing qrString/websocketId");
  }
  return {
    qrString,
    prn: data.prn ?? input.referenceLabel,
    websocketId: data.websocketId,
  };
}

export async function getPaymentStatus(
  referenceLabel: string,
): Promise<FonepayPaymentStatus> {
  if (!isFonepayConfigured()) throw new FonepayError("Fonepay is not configured");

  const body = JSON.stringify({
    terminalId: env.FONEPAY_TERMINAL_ID,
    referenceLabel,
  });
  const res = await authedRequest("/thirdPartyDynamicQrGetStatus", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FonepayError(
      `Fonepay status check failed: HTTP ${res.status} ${text.slice(0, 300)}`,
      res.status,
    );
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const statusRaw = String(raw.paymentStatus ?? "").toLowerCase();
  const paymentStatus =
    statusRaw === "success" || statusRaw === "failed" ? statusRaw : "pending";
  return {
    paymentStatus,
    fonepayTraceId: raw.fonepayTraceId != null ? String(raw.fonepayTraceId) : null,
    totalTransactionAmount: parseNprAmount(raw.totalTransactionAmount),
    paymentMessage: String(raw.paymentMessage ?? ""),
    raw,
  };
}

// ─── Bank list (stable → cached ~1h) ─────────────────────────────────────────

let banksCache: { banks: BankDetail[]; expiresAt: number } | null = null;

export async function fetchBanksList(): Promise<BankDetail[]> {
  if (!isFonepayConfigured()) throw new FonepayError("Fonepay is not configured");
  if (banksCache && Date.now() < banksCache.expiresAt) return banksCache.banks;

  const res = await authedRequest("/banks/list", {
    method: "GET",
    headers: { paymentMode: "INTENT" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FonepayError(
      `Fonepay bank list failed: HTTP ${res.status} ${text.slice(0, 300)}`,
      res.status,
    );
  }
  const data = (await res.json()) as { bankDetails?: BankDetail[] };
  const banks = (data.bankDetails ?? []).filter(
    (b) => b && b.bankName && b.intentScheme,
  );
  banksCache = { banks, expiresAt: Date.now() + BANKS_CACHE_MS };
  return banks;
}

// Unit tests for the Fonepay Intent/Dynamic QR client. Env is stubbed before
// the dynamic import because lib/env caches on first access; fetch is mocked
// so no test ever talks to Fonepay.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";

// Ephemeral RSA keypair — same PKCS8-base64 format Fonepay issues. Tests use
// a throwaway key so no real credential ever lands in the repo.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privateKeyBase64 = privateKey
  .export({ format: "der", type: "pkcs8" })
  .toString("base64");

const env = process.env as Record<string, string | undefined>;
env.FONEPAY_BASE_URL = "https://fonepay.test/merchantThirdparty";
env.FONEPAY_BASE_PATH = "/api/merchant/third-party/v2";
env.FONEPAY_USERNAME = "testuser";
env.FONEPAY_PASSWORD = "testpass";
env.FONEPAY_PRIVATE_KEY = privateKeyBase64;
env.FONEPAY_TERMINAL_ID = "4271420000001762";

const fonepay = await import("@/lib/payment/fonepay-intent");
const {
  FonepayError,
  fetchBanksList,
  generateIntentQr,
  getPaymentStatus,
  isFonepayConfigured,
  makeReferenceLabel,
  parseNprAmount,
  resetFonepayCaches,
  signPayload,
} = fonepay;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const loginResponse = {
  accessToken: "Bearer test-token",
  refreshToken: "r",
  tokenType: "Bearer",
  expiresIn: 3600,
};

describe("makeReferenceLabel", () => {
  it("strips non-alphanumerics from the order number and appends the attempt", () => {
    expect(makeReferenceLabel("SK-000042", 1)).toBe("SK000042A1");
    expect(makeReferenceLabel("SK-000042", 12)).toBe("SK000042A12");
  });

  it("always produces Fonepay-legal labels (alphanumeric, ≤30 chars)", () => {
    const label = makeReferenceLabel("SK-999999", 99);
    expect(label).toMatch(/^[A-Za-z0-9]{1,30}$/);
  });

  it("throws when the result would exceed 30 characters", () => {
    expect(() => makeReferenceLabel("X".repeat(35), 1)).toThrow(FonepayError);
  });
});

describe("signPayload", () => {
  it("produces a Base64 RSA-SHA256 signature that verifies against the public key", () => {
    const body = JSON.stringify({ username: "testuser", password: "testpass" });
    const signature = signPayload(body, privateKeyBase64);

    const verifier = createVerify("RSA-SHA256").update(body, "utf8");
    expect(
      verifier.verify(publicKey, signature, "base64"),
    ).toBe(true);
  });

  it("signs the exact byte string — a different body fails verification", () => {
    const body = JSON.stringify({ a: 1 });
    const signature = signPayload(body, privateKeyBase64);
    const verifier = createVerify("RSA-SHA256").update(
      JSON.stringify({ a: 2 }),
      "utf8",
    );
    expect(
      verifier.verify(publicKey, signature, "base64"),
    ).toBe(false);
  });

  it("accepts keys with embedded whitespace/newlines (PEM-ish paste)", () => {
    const wrapped = privateKeyBase64.replace(/(.{64})/g, "$1\n");
    const body = "{}";
    expect(signPayload(body, wrapped)).toBe(signPayload(body, privateKeyBase64));
  });
});

describe("parseNprAmount", () => {
  it('parses Fonepay\'s "100.00"-style strings to numbers', () => {
    expect(parseNprAmount("100.00")).toBe(100);
    expect(parseNprAmount("4500.00")).toBe(4500);
    expect(parseNprAmount("4500.50")).toBe(4500.5);
  });

  it("passes numbers through and rejects garbage", () => {
    expect(parseNprAmount(4500)).toBe(4500);
    expect(parseNprAmount("abc")).toBeNull();
    expect(parseNprAmount(null)).toBeNull();
    expect(parseNprAmount(undefined)).toBeNull();
  });
});

describe("isFonepayConfigured", () => {
  it("is true with the full test config", () => {
    expect(isFonepayConfigured()).toBe(true);
  });
});

describe("API calls", () => {
  beforeEach(() => {
    resetFonepayCaches();
    vi.restoreAllMocks();
  });

  it("logs in once and reuses the cached token across calls", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.endsWith("/login")) return jsonResponse(loginResponse);
      return jsonResponse({
        prn: "SK000042A1",
        paymentStatus: "pending",
        paymentMessage: "Payment pending",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getPaymentStatus("SK000042A1");
    await getPaymentStatus("SK000042A1");

    const loginCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith("/login"),
    );
    expect(loginCalls).toHaveLength(1);
  });

  it("re-logs in and retries once on 401", async () => {
    let statusCalls = 0;
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.endsWith("/login")) return jsonResponse(loginResponse);
      statusCalls += 1;
      if (statusCalls === 1) return jsonResponse({ message: "expired" }, 401);
      return jsonResponse({
        paymentStatus: "success",
        fonepayTraceId: 3301232,
        totalTransactionAmount: "100.00",
        paymentMessage: "Payment success",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await getPaymentStatus("SK000042A1");
    expect(status.paymentStatus).toBe("success");
    expect(statusCalls).toBe(2);
    const loginCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith("/login"),
    );
    expect(loginCalls).toHaveLength(2);
  });

  it("maps status fields and parses string amounts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        if (String(url).endsWith("/login")) return jsonResponse(loginResponse);
        return jsonResponse({
          prn: "SK000042A1",
          merchantCode: "4271420000001762",
          paymentStatus: "success",
          fonepayTraceId: 3301232,
          requestedAmount: "100.00",
          totalTransactionAmount: "100.00",
          paymentMessage: "Payment success",
        });
      }),
    );

    const status = await getPaymentStatus("SK000042A1");
    expect(status.paymentStatus).toBe("success");
    expect(status.totalTransactionAmount).toBe(100);
    expect(status.fonepayTraceId).toBe("3301232");
  });

  it("treats unknown payment statuses as pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        if (String(url).endsWith("/login")) return jsonResponse(loginResponse);
        return jsonResponse({ paymentStatus: "PROCESSING" });
      }),
    );
    const status = await getPaymentStatus("SK000042A1");
    expect(status.paymentStatus).toBe("pending");
  });

  it("sends signature + Authorization headers on QR generation", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      if (String(url).endsWith("/login")) return jsonResponse(loginResponse);
      return jsonResponse({
        qrString: "0002010102...",
        prn: "SK000042A1",
        websocketId: "wss://ws.fonepay.test/x/y/Y",
        status: "Success",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const qr = await generateIntentQr({
      amount: 4500,
      billId: "SK-000042",
      referenceLabel: "SK000042A1",
    });
    expect(qr.qrString).toBeTruthy();
    expect(qr.websocketId).toContain("wss://");

    const qrCall = fetchMock.mock.calls.find(([u]) =>
      String(u).endsWith("/generate-intent-qr"),
    );
    expect(qrCall).toBeTruthy();
    const init = qrCall![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers.signature).toBeTruthy();
    // Signature must be over the exact body string sent.
    const verifier = createVerify("RSA-SHA256").update(String(init.body), "utf8");
    expect(
      verifier.verify(publicKey, headers.signature, "base64"),
    ).toBe(true);
  });

  it("rejects out-of-range amounts and bad reference labels locally", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      generateIntentQr({ amount: 0, billId: "B", referenceLabel: "REF1" }),
    ).rejects.toThrow(FonepayError);
    await expect(
      generateIntentQr({
        amount: 10_000_000,
        billId: "B",
        referenceLabel: "REF1",
      }),
    ).rejects.toThrow(FonepayError);
    await expect(
      generateIntentQr({ amount: 100, billId: "B", referenceLabel: "REF-1" }),
    ).rejects.toThrow(FonepayError);
  });

  it("caches the bank list", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith("/login")) return jsonResponse(loginResponse);
      return jsonResponse({
        bankDetails: [
          {
            bankName: "Laxmi Sunrise",
            bankCode: "LXBLNPKA",
            bankIcon: "https://example.com/laxmi.png",
            packageName: "com.lxblnpka.app",
            intentScheme: "LXBLNPKA://payment",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchBanksList();
    const second = await fetchBanksList();
    expect(first).toHaveLength(1);
    expect(second).toBe(first);
    const bankCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith("/banks/list"),
    );
    expect(bankCalls).toHaveLength(1);
  });
});

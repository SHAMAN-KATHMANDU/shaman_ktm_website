// lib/payment/fonepay.ts signing + verification, with an explicit config so
// nothing depends on FONEPAY_* env values. Signatures are round-tripped with
// the same HMAC the module uses, plus tamper cases for every check that must
// hold before an order is marked paid.

import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  buildRedirectUrl,
  mintPrn,
  verifyReturnParams,
  type FonepayConfig,
  type FonepayReturnParams,
} from "@/lib/payment/fonepay";

const cfg: FonepayConfig = {
  merchantCode: "NBQM",
  secret: "test-secret",
  baseUrl: "https://gateway.test/api/merchantRequest",
  mode: "sandbox",
};

function sign(message: string, secret = cfg.secret): string {
  return crypto.createHmac("sha512", secret).update(message).digest("hex");
}

function signedReturn(
  overrides: Partial<FonepayReturnParams> = {},
  secret = cfg.secret,
): FonepayReturnParams {
  const p: FonepayReturnParams = {
    PRN: "SK-000042-1720000000000",
    PID: "NBQM",
    PS: "true",
    RC: "successful",
    UID: "1234567",
    BC: "NICENPKA",
    INI: "9800000000",
    P_AMT: "4500",
    R_AMT: "0",
    ...overrides,
  };
  const message = [
    p.PRN,
    p.PID,
    p.PS,
    p.RC,
    p.UID,
    p.BC,
    p.INI,
    p.P_AMT,
    p.R_AMT,
  ]
    .map((v) => v ?? "")
    .join(",");
  return { ...p, DV: sign(message, secret) };
}

describe("mintPrn", () => {
  it("is unique per attempt and stays within Fonepay's 25-char limit", () => {
    const prn = mintPrn("SK-000042", new Date(1720000000000));
    expect(prn).toBe("SK-000042-1720000000000");
    expect(prn.length).toBeLessThanOrEqual(25);
  });
});

describe("buildRedirectUrl", () => {
  it("builds a signed URL with all request fields", () => {
    const url = new URL(
      buildRedirectUrl({
        amountNpr: 4500,
        prn: "SK-000042-1720000000000",
        returnUrl: "https://shamankathmandu.com/api/payment/fonepay/return",
        remarks1: "SK-000042",
        now: new Date("2026-07-11T12:00:00+05:45"),
        config: cfg,
      }),
    );

    expect(url.origin + url.pathname).toBe(cfg.baseUrl);
    expect(url.searchParams.get("PID")).toBe("NBQM");
    expect(url.searchParams.get("MD")).toBe("P");
    expect(url.searchParams.get("AMT")).toBe("4500");
    expect(url.searchParams.get("CRN")).toBe("NPR");
    expect(url.searchParams.get("DT")).toBe("07/11/2026");
    expect(url.searchParams.get("RU")).toBe(
      "https://shamankathmandu.com/api/payment/fonepay/return",
    );

    // DV must be the HMAC over the exact comma-joined field values, in order.
    const message = [
      "PID",
      "MD",
      "PRN",
      "AMT",
      "CRN",
      "DT",
      "R1",
      "R2",
      "RU",
    ]
      .map((k) => url.searchParams.get(k))
      .join(",");
    expect(url.searchParams.get("DV")).toBe(sign(message));
  });

  it("strips commas from remarks so they can't break the signature message", () => {
    const url = new URL(
      buildRedirectUrl({
        amountNpr: 100,
        prn: "SK-000001-1",
        returnUrl: "https://example.com/return",
        remarks1: "order, with commas",
        config: cfg,
      }),
    );
    expect(url.searchParams.get("R1")).not.toContain(",");
  });

  it("rejects non-integer and non-positive amounts", () => {
    const base = {
      prn: "SK-000001-1",
      returnUrl: "https://example.com/return",
      remarks1: "x",
      config: cfg,
    };
    expect(() => buildRedirectUrl({ ...base, amountNpr: 45.5 })).toThrow();
    expect(() => buildRedirectUrl({ ...base, amountNpr: 0 })).toThrow();
  });

  it("refuses to run unconfigured", () => {
    expect(() =>
      buildRedirectUrl({
        amountNpr: 100,
        prn: "SK-000001-1",
        returnUrl: "https://example.com/return",
        remarks1: "x",
        config: { ...cfg, secret: "" },
      }),
    ).toThrow(/not configured/);
  });
});

describe("verifyReturnParams", () => {
  it("accepts a correctly signed successful payment with matching amount", () => {
    const result = verifyReturnParams(signedReturn(), { amountNpr: 4500 }, cfg);
    expect(result.signatureValid).toBe(true);
    expect(result.paymentSucceeded).toBe(true);
    expect(result.amountMatches).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const params = signedReturn();
    params.P_AMT = "1"; // change after signing
    const result = verifyReturnParams(params, { amountNpr: 4500 }, cfg);
    expect(result.signatureValid).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("rejects params signed with the wrong secret", () => {
    const params = signedReturn({}, "attacker-secret");
    const result = verifyReturnParams(params, { amountNpr: 4500 }, cfg);
    expect(result.signatureValid).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("rejects a wrong merchant code outright", () => {
    const result = verifyReturnParams(
      signedReturn({ PID: "OTHER" }),
      { amountNpr: 4500 },
      cfg,
    );
    expect(result.ok).toBe(false);
  });

  it("treats a signed PS=false as a failed payment, not a forgery", () => {
    const result = verifyReturnParams(
      signedReturn({ PS: "false", RC: "failed" }),
      { amountNpr: 4500 },
      cfg,
    );
    expect(result.signatureValid).toBe(true);
    expect(result.paymentSucceeded).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("flags a validly-signed amount that doesn't match the order total", () => {
    // Gateway signs what was actually paid; if that isn't the order total the
    // settlement must not go through.
    const result = verifyReturnParams(
      signedReturn({ P_AMT: "100" }),
      { amountNpr: 4500 },
      cfg,
    );
    expect(result.signatureValid).toBe(true);
    expect(result.amountMatches).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("fails closed on missing DV or PRN", () => {
    expect(
      verifyReturnParams({ PRN: "x" }, { amountNpr: 1 }, cfg).ok,
    ).toBe(false);
    expect(
      verifyReturnParams({ DV: "aa" }, { amountNpr: 1 }, cfg).ok,
    ).toBe(false);
  });
});

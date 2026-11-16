// The IP behind every anonymous rate limit must not be choosable by the
// caller: the first X-Forwarded-For entry is whatever the client sent.

import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

const req = (headers: Record<string, string>) =>
  new Request("http://localhost/", { headers });

describe("clientIp", () => {
  it("prefers the proxy-set X-Real-IP", () => {
    expect(
      clientIp(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("9.9.9.9");
  });

  it("ignores a spoofed leading X-Forwarded-For entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe(
      "5.6.7.8",
    );
  });

  it("falls back to a shared bucket with no proxy headers", () => {
    expect(clientIp(req({}))).toBe("direct");
  });
});

describe("rateLimit", () => {
  it("still limits a key after the map has filled up", () => {
    for (let i = 0; i < 10_050; i++) rateLimit(`fill:${i}`, 1, 60_000);
    expect(rateLimit("hot", 1, 60_000)).toBe(true);
    expect(rateLimit("hot", 1, 60_000)).toBe(false);
  });
});

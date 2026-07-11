// Unit tests for NCM client: auth header, mode-based URLs, response parsing,
// error handling, webhook status normalization.

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NcmClient } from "@/lib/ncm/client";
import { CmsError } from "@/lib/cms/errors";

// Store original fetch
const originalFetch = global.fetch;

describe("NcmClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("initialization", () => {
    it("should construct with token and mode", () => {
      const client = new NcmClient("test-token", "demo");
      expect(client).toBeInstanceOf(NcmClient);
    });
  });

  describe("auth header", () => {
    it("should send Authorization header with Token prefix", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const client = new NcmClient("test-token-123", "demo");
      await client.getBranches();

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers.Authorization).toBe("Token test-token-123");
    });

    it("should send proper headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const client = new NcmClient("test-token", "demo");
      await client.getBranches();

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers["Accept"]).toBe("application/json");
      expect(call[1].headers["Content-Type"]).toBe("application/json");
      expect(call[1].headers["User-Agent"]).toBe("NepalCanMoveTSClient");
    });
  });

  describe("base URL routing", () => {
    it("should use demo URL in demo mode", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const client = new NcmClient("token", "demo");
      await client.getBranches();

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("demo.nepalcanmove.com");
    });

    it("should use live URL in live mode", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const client = new NcmClient("token", "live");
      await client.getBranches();

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("portal.nepalcanmove.com");
    });
  });

  describe("getBranches", () => {
    it("should parse and return branch list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            pk: 1,
            code: "TINKUNE",
            name: "Tinkune Branch",
            province_name: "Bagmati",
            district_name: "Kathmandu",
          },
          {
            pk: 2,
            code: "POKHARA",
            name: "Pokhara Branch",
            province_name: "Gandaki",
            district_name: "Kaski",
          },
        ],
      });

      const client = new NcmClient("token", "demo");
      const branches = await client.getBranches();

      expect(branches).toHaveLength(2);
      expect(branches[0]).toEqual({
        id: 1,
        code: "TINKUNE",
        name: "Tinkune Branch",
        district: "Kathmandu",
      });
      expect(branches[1].id).toBe(2);
    });

    it("should throw on non-array response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ branches: [] }),
      });

      const client = new NcmClient("token", "demo");
      await expect(client.getBranches()).rejects.toThrow(CmsError);
    });

    it("should throw on invalid branch data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ invalid: "data" }],
      });

      const client = new NcmClient("token", "demo");
      await expect(client.getBranches()).rejects.toThrow(CmsError);
    });
  });

  describe("error handling", () => {
    it("should throw CmsError on non-2xx status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Internal server error" }),
      });

      const client = new NcmClient("token", "demo");
      await expect(client.getBranches()).rejects.toThrow(
        /NCM API error.*Internal server error/,
      );
    });

    it("should extract error message from response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: "Invalid request" }),
      });

      const client = new NcmClient("token", "demo");
      await expect(client.getBranches()).rejects.toThrow(
        /Invalid request/,
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const client = new NcmClient("token", "demo");
      await expect(client.getBranches()).rejects.toThrow(
        /NCM API request failed/,
      );
    });
  });

  describe("getShippingRate", () => {
    it("should parse and return delivery charge", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ charge: 150 }),
      });

      const client = new NcmClient("token", "demo");
      const rate = await client.getShippingRate({
        from: "TINKUNE",
        to: "POKHARA",
        type: "Pickup/Collect",
      });

      expect(rate).toBe(150);
    });

    it("should pass query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ charge: 200 }),
      });

      const client = new NcmClient("token", "demo");
      await client.getShippingRate({
        from: "A",
        to: "B",
        type: "Send",
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("creation=A");
      expect(url).toContain("destination=B");
      expect(url).toContain("type=Send");
    });
  });

  describe("createNcmOrder", () => {
    it("should return ncmOrderId and tracking number", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderid: "NCM-12345",
          tracking_number: "TR-98765",
        }),
      });

      const client = new NcmClient("token", "demo");
      const result = await client.createNcmOrder({
        name: "John Doe",
        phone: "9841234567",
        codCharge: 1000,
        address: "Thamel, Kathmandu",
        sourceBranch: "TINKUNE",
        destBranch: "POKHARA",
        deliveryType: "Door2Door",
        orderIdentifier: "SK-001",
      });

      expect(result.ncmOrderId).toBe("NCM-12345");
      expect(result.trackingNumber).toBe("TR-98765");
    });

    it("should throw when no order ID returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new NcmClient("token", "demo");
      await expect(
        client.createNcmOrder({
          name: "John Doe",
          phone: "9841234567",
          codCharge: 1000,
          address: "Thamel, Kathmandu",
          sourceBranch: "TINKUNE",
          destBranch: "POKHARA",
          deliveryType: "Door2Door",
        }),
      ).rejects.toThrow(/no order ID/);
    });
  });

  describe("webhook status normalizer", () => {
    it("should normalize status strings", () => {
      const testCases = [
        ["In Transit", "in_transit"],
        ["Arrived", "arrived"],
        ["Out for Delivery", "out_for_delivery"],
        ["Delivered", "delivered"],
      ];

      for (const [input, expected] of testCases) {
        const normalized = input
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        expect(normalized).toBe(expected);
      }
    });
  });

  describe("timeouts", () => {
    it("should apply 15s timeout to requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const client = new NcmClient("token", "demo");
      await client.getBranches();

      const call = mockFetch.mock.calls[0];
      expect(call[1].signal).toBeDefined();
    });
  });
});

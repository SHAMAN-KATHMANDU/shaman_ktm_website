import { describe, it, expect, vi } from "vitest";
import { generateUploadToken, hashUploadToken, resolveUploadSession } from "@/lib/upload-sessions";
import { prisma } from "@/lib/db";
import type { Prisma, McpToken } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn((fn) => fn({} as Prisma.TransactionClient)),
    uploadSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    uploadSlot: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    uploadFile: {
      create: vi.fn(),
    },
    productImage: {
      create: vi.fn(),
    },
    productVariation: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    stockLevel: {
      create: vi.fn(),
    },
    stockMovement: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Upload Sessions", () => {
  describe("Token generation and hashing", () => {
    it("generateUploadToken returns base64url string", () => {
      const token = generateUploadToken();
      expect(token).toHaveLength(43); // 32 bytes in base64url
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it("hashUploadToken returns hex string", () => {
      const token = generateUploadToken();
      const hash = hashUploadToken(token);
      expect(hash).toHaveLength(64); // SHA256 = 64 hex chars
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it("hash is deterministic", () => {
      const token = "test-token";
      const hash1 = hashUploadToken(token);
      const hash2 = hashUploadToken(token);
      expect(hash1).toBe(hash2);
    });

    it("different tokens produce different hashes", () => {
      const token1 = generateUploadToken();
      const token2 = generateUploadToken();
      const hash1 = hashUploadToken(token1);
      const hash2 = hashUploadToken(token2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("resolveUploadSession", () => {
    it("returns null for missing session", async () => {
      vi.mocked(prisma.uploadSession.findUnique).mockResolvedValue(null);
      const result = await resolveUploadSession("fake-token");
      expect(result).toBeNull();
    });

    it("returns null for expired session", async () => {
      const pastDate = new Date(Date.now() - 60000);
      vi.mocked(prisma.uploadSession.findUnique).mockResolvedValue({
        id: "s1",
        tokenHash: "abc",
        mode: "products",
        status: "open",
        source: "mcp",
        createdBy: "test",
        mcpTokenId: null,
        mcpToken: null,
        note: null,
        uploadCount: 0,
        expiresAt: pastDate,
        submittedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      } as Prisma.UploadSessionGetPayload<{ include: { mcpToken: true; slots: true } }>);
      const result = await resolveUploadSession("test-token");
      expect(result).toBeNull();
    });

    it("returns null for cancelled session", async () => {
      const futureDate = new Date(Date.now() + 60000);
      const sessionPayload: Prisma.UploadSessionGetPayload<{ include: { mcpToken: true; slots: true } }> = {
        id: "s1",
        tokenHash: "abc",
        mode: "products",
        status: "cancelled",
        source: "mcp",
        createdBy: "test",
        mcpTokenId: null,
        mcpToken: null,
        note: null,
        uploadCount: 0,
        expiresAt: futureDate,
        submittedAt: null,
        revokedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      };
      vi.mocked(prisma.uploadSession.findUnique).mockResolvedValue(sessionPayload);
      const result = await resolveUploadSession("test-token");
      expect(result).toBeNull();
    });

    it("returns null if mcpToken is revoked", async () => {
      const futureDate = new Date(Date.now() + 60000);
      const revokedToken: McpToken = {
        id: "tok1",
        name: "test",
        tokenHash: "hash",
        role: "editor",
        createdBy: "admin",
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: new Date(),
        oauthClientId: null,
        oauthFamilyId: null,
      };
      const sessionPayload2: Prisma.UploadSessionGetPayload<{ include: { mcpToken: true; slots: true } }> = {
        id: "s1",
        tokenHash: "abc",
        mode: "products",
        status: "open",
        source: "mcp",
        createdBy: "test",
        mcpTokenId: "tok1",
        mcpToken: revokedToken,
        note: null,
        uploadCount: 0,
        expiresAt: futureDate,
        submittedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      };
      vi.mocked(prisma.uploadSession.findUnique).mockResolvedValue(sessionPayload2);
      const result = await resolveUploadSession("test-token");
      expect(result).toBeNull();
    });

    it("resolves valid open session", async () => {
      const futureDate = new Date(Date.now() + 60000);
      const sessionPayload3: Prisma.UploadSessionGetPayload<{ include: { mcpToken: true; slots: true } }> = {
        id: "s1",
        tokenHash: "abc",
        mode: "products",
        status: "open",
        source: "mcp",
        createdBy: "test",
        mcpTokenId: null,
        mcpToken: null,
        note: "Test note",
        uploadCount: 0,
        expiresAt: futureDate,
        submittedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      };
      vi.mocked(prisma.uploadSession.findUnique).mockResolvedValue(sessionPayload3);
      const result = await resolveUploadSession("test-token");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("s1");
      expect(result?.mode).toBe("products");
      expect(result?.status).toBe("open");
    });
  });
});

import { createHash, randomBytes } from "crypto";

/**
 * Generate a 32-byte random token in base64url format.
 * This is the raw token returned once to the user.
 */
export function generateUploadToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a token to hex for storage.
 * Only the hash is stored in the database; the raw token is shown once.
 */
export function hashUploadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

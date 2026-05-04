// Stub env so lib/env.ts (validated lazily on first access) doesn't reject
// tests for missing values. NODE_ENV is read-only in TS but writable at
// runtime — cast to a plain Record skips the type guard.
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV ??= "test";
env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
env.SESSION_PASSWORD ??= "test-password-that-is-at-least-32-characters-long";
env.ADMIN_BOOTSTRAP_EMAIL ??= "test@example.com";
env.ADMIN_BOOTSTRAP_PASSWORD ??= "TestPass1234!";
env.S3_PUBLIC_BASE ??= "https://test-bucket.s3.ap-south-1.amazonaws.com";

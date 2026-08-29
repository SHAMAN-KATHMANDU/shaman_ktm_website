import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // Raised from vitest's 5000ms default, which had stopped fitting this
    // suite: three files (auth-password, delete-role-gate,
    // mcp-connection-revoke) were failing intermittently at 5.1-5.3s — a
    // hundred-odd milliseconds the wrong side of the limit, not a hundred
    // times over it. auth-password is the clearest case: bcryptjs at cost 10
    // is pure JS and CPU-bound, so it lands near the boundary on a loaded
    // machine and over it when anything else is competing.
    //
    // Deliberately generous-but-bounded rather than removed: a genuine
    // slowdown should still be able to fail this suite, and 15s leaves room
    // for that while ending the false failures. If a test ever needs longer
    // than this, that is a signal worth reading, not a number worth raising.
    testTimeout: 15000,
  },
});

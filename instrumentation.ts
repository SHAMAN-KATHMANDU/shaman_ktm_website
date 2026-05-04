// Boot-time hook: Next.js calls register() once when the server starts.
// We use it to validate the environment up-front so a missing SESSION_PASSWORD
// or DATABASE_URL fails the container immediately instead of at first request.

export async function register() {
  // Edge runtime imports a different bundle and we don't want env validation
  // duplicated there — Node runtime is the source of truth.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { loadEnv } = await import("./lib/env");
  loadEnv();
}

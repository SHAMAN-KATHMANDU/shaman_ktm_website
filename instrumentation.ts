// Boot-time hook: Next.js calls register() once when the server starts.
// We use it to validate the environment up-front so a missing SESSION_PASSWORD
// or DATABASE_URL fails the container immediately instead of at first request.

export async function register() {
  // Edge runtime imports a different bundle and we don't want env validation
  // duplicated there — Node runtime is the source of truth.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { loadEnv } = await import("./lib/env");
  const env = loadEnv();

  // A container without SMTP_HOST discards every email it is asked to send.
  // lib/email.ts already reports each drop, but only once something has been
  // lost — by then a customer has been told to check an inbox that will stay
  // empty. Saying it at boot puts the defect in `docker logs` from the first
  // line, before the first casualty rather than after it.
  //
  // Warn, never fail: refusing to boot would trade dropped email for a dead
  // site, and production is running with SMTP unset right now.
  if (env.NODE_ENV === "production" && !env.SMTP_HOST) {
    console.error(
      "[email] STARTUP: SMTP_HOST is not set — every email this container " +
        "sends will be DROPPED, not queued and not retried. Password resets " +
        "and order confirmations will not reach customers. The SMTP_* values " +
        "must be in the app service's environment: block of the compose file " +
        "the host actually runs; adding them to .env alone does nothing. " +
        "Re-create the container afterwards (docker compose up -d app). " +
        "See deploy/prod/check-env.sh.",
    );
  }
}

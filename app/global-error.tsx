"use client";

// Last-resort error boundary that wraps the entire <html> document — used
// when the root layout itself throws. Must render its own <html>/<body>.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0806",
          color: "#e7d9b8",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Something broke at the root.
          </h1>
          <p style={{ marginBottom: "1.5rem", opacity: 0.7 }}>
            The error has been logged.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 2rem",
              background: "transparent",
              color: "#c4a35a",
              border: "1px solid #c4a35a",
              cursor: "pointer",
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: "0.75rem", opacity: 0.4 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

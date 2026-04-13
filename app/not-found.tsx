import Link from "next/link";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { SiteShell } from "@/components/site/layout/site-shell";
import { T } from "@/components/site/i18n/t";

export default function NotFound() {
  if (IS_COMING_SOON) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "var(--font-body), sans-serif",
          color: "var(--uc-ink-strong)",
          background: "var(--uc-bg-a)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Nothing here yet
          </h1>
          <p style={{ marginBottom: "1.25rem" }}>
            Our new site is on the way.
          </p>
          <Link
            href="/"
            style={{
              color: "var(--uc-accent)",
              textDecoration: "underline",
            }}
          >
            Back home →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SiteShell>
      <section className="sk-section sk-parch">
        <div
          className="sk-wrap"
          style={{ textAlign: "center", padding: "80px 0" }}
        >
          <p className="sk-eyebrow">
            <T en="404" np="४०४" />
          </p>
          <h1 className="sk-section-h" style={{ marginTop: 10 }}>
            <T
              en={<>We couldn&apos;t <em>find that page</em></>}
              np={<>पृष्ठ <em>फेला परेन</em></>}
            />
          </h1>
          <p style={{ color: "var(--sk-stone)", margin: "16px 0 28px" }}>
            <T
              en="The link may be broken or the page may have moved."
              np="लिङ्क टुटेको वा पृष्ठ सरेको हुन सक्छ।"
            />
          </p>
          <Link href="/" className="sk-btn sk-btn-green">
            <T en="Back home →" np="गृहमा फर्किनुहोस् →" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}

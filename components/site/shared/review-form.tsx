"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

/** Storefront review form for one product (productId) or one service (serviceSlug). */
export function ReviewForm(
  target: { productId: string } | { serviceSlug: string },
) {
  const { locale } = splitLocale(usePathname());
  const t = getDictionary(locale).reviews;
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError(t.pickRating);
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/public/v1/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          rating,
          title,
          body,
          authorName,
          authorEmail: authorEmail.trim() || undefined,
          website,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(res.status === 429 && j?.message ? j.message : t.error);
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError(t.error);
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div role="status" className="border border-metal bg-metal-tint p-8 text-center">
        <p className="font-display italic text-2xl text-metal-text mb-2">
          {t.thanksHeading}
        </p>
        <p className="text-sm text-ink-soft">{t.thanks}</p>
      </div>
    );
  }

  const inputCls =
    "mt-2 w-full bg-bone border border-line focus:border-metal-deep outline-none px-4 py-3 text-sm text-ink font-sans normal-case tracking-normal";
  const labelCls = "mt-4 block label-nav text-[10px] text-metal-ink";

  return (
    <form onSubmit={submit} className="border border-metal bg-metal-tint p-8">
      <h3 className="font-display text-2xl text-ink mb-2">{t.formHeading}</h3>
      <p className="text-sm text-ink-soft mb-4">{t.formIntro}</p>

      <fieldset>
        <legend className="block label-nav text-[10px] text-metal-ink mb-2">
          {t.rating}
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`block text-2xl leading-none px-0.5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-metal-deep ${
                  n <= rating ? "text-metal-text" : "text-line"
                }`}
              >
                ★
              </span>
              <span className="sr-only">
                {t.stars.replace("{n}", String(n))}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={labelCls}>
        {t.title}
        <input
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className={labelCls}>
        {t.body}
        <textarea
          required
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={inputCls}
        />
      </label>
      <div className="grid gap-x-4 md:grid-cols-2">
        <label className={labelCls}>
          {t.name}
          <input
            type="text"
            required
            maxLength={80}
            autoComplete="name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          {t.email}
          <input
            type="email"
            autoComplete="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      {/* Honeypot — hidden from real users, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p role="alert" className="mt-4 text-sm text-rakta">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-6 label-nav text-[11px] bg-metal-deep text-bone hover:bg-metal-ink transition-colors px-6 py-4 disabled:opacity-50 cursor-pointer"
      >
        {state === "sending" ? t.sending : t.submit}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import type { Messages } from "@/lib/i18n/types";

interface Props {
  t: Messages["wholesale"];
  /** Prefilled when the visitor arrived from a product card. */
  initialProduct?: string;
}

const inputClass =
  "mt-2 w-full bg-bone rounded-input border border-line focus:border-metal-deep outline-none px-4 py-3 text-sm text-ink font-sans normal-case tracking-normal";
const labelClass = "block label-nav text-[10px] text-metal-ink mb-2";

// The only route to a wholesale price — the catalogue shows MOQ and nothing
// else — so this is the front of the B2B pipeline rather than a contact form.
// Carries a honeypot field ("website") that must stay empty.
export function WholesaleEnquiryForm({ t, initialProduct }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [productInterest, setProductInterest] = useState(initialProduct ?? "");
  const [quantityNeeded, setQuantityNeeded] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError(null);
    const qty = Number(quantityNeeded);
    try {
      const res = await fetch("/api/public/v1/wholesale-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          whatsapp,
          email: email || null,
          productInterest: productInterest || null,
          // Blank stays blank rather than becoming 0 — an unanswered question
          // and "none needed" are different answers.
          quantityNeeded: Number.isInteger(qty) && qty > 0 ? qty : null,
          note: note || null,
          website,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setState("done");
    } catch {
      setState("idle");
      setError(t.formError);
    }
  };

  if (state === "done") {
    return (
      <div className="border border-metal bg-metal-tint rounded-card p-8 md:p-10 text-center">
        <p className="font-display italic text-2xl text-metal-text mb-3">
          {t.successHeading}
        </p>
        <p className="text-sm text-ink-soft leading-relaxed">
          {t.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-metal bg-metal-tint rounded-card p-8 md:p-10"
    >
      <h3 className="font-display text-2xl text-ink mb-2">
        {t.formHeading}
      </h3>
      <p className="text-sm text-ink-soft mb-6">
        {t.formDescription}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
        <label className={labelClass}>
          {t.companyLabel}
          <input
            type="text"
            required
            maxLength={120}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} mt-4 md:mt-0`}>
          {t.contactLabel}
          <input
            type="text"
            required
            maxLength={120}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} mt-4`}>
          {t.whatsappLabel}
          <input
            type="tel"
            required
            placeholder="+977 98X-XXX-XXXX"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} mt-4`}>
          {t.emailLabel} <span className="normal-case">({t.optional})</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} mt-4`}>
          {t.productLabel} <span className="normal-case">({t.optional})</span>
          <input
            type="text"
            maxLength={256}
            value={productInterest}
            onChange={(e) => setProductInterest(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} mt-4`}>
          {t.quantityLabel} <span className="normal-case">({t.optional})</span>
          <input
            type="number"
            min={1}
            max={100000}
            value={quantityNeeded}
            onChange={(e) => setQuantityNeeded(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className={`${labelClass} mt-4`}>
        {t.noteLabel} <span className="normal-case">({t.optional})</span>
        <textarea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </label>

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
        <p className="mt-4 text-sm text-rakta">{error}</p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="mt-6 w-full label-nav text-[11px] bg-metal-deep text-bone hover:bg-metal-ink rounded-input transition-colors px-6 py-4 disabled:opacity-50 cursor-pointer"
      >
        {state === "submitting" ? "…" : t.submit}
      </button>
      <p className="mt-4 text-[11px] text-ink-soft text-center">
        {t.finePrint}
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

interface Props {
  formHeading: string;
  formDescription: string;
  nameLabel: string;
  whatsappLabel: string;
  buttonLabel: string;
  finePrint: string;
  successHeading: string;
  successMessage: string;
}

// Join form for the Member Circle band. POSTs to the public member-leads
// endpoint; carries a honeypot field ("website") that must stay empty.
export function MemberCircleForm({
  formHeading,
  formDescription,
  nameLabel,
  whatsappLabel,
  buttonLabel,
  finePrint,
  successHeading,
  successMessage,
}: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/public/v1/member-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          whatsapp,
          website,
          source: "homepage-member-circle",
        }),
      });
      if (!res.ok) throw new Error("failed");
      setState("done");
    } catch {
      setState("idle");
      setError(t.memberCircle.formError);
    }
  };

  if (state === "done") {
    return (
      <div className="border border-metal bg-metal-tint rounded-card p-8 md:p-10 text-center self-center">
        <p className="font-display italic text-2xl text-metal-text mb-3">
          {successHeading}
        </p>
        <p className="text-sm text-ink-soft leading-relaxed">
          {successMessage}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-metal bg-metal-tint rounded-card p-8 md:p-10 self-center"
    >
      <h3 className="font-display text-2xl text-ink mb-2">
        {formHeading}
      </h3>
      <p className="text-sm text-ink-soft mb-6">
        {formDescription}
      </p>

      <label className="block label-nav text-[10px] text-metal-ink mb-2">
        {nameLabel}
        <input
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full bg-bone rounded-input border border-line focus:border-metal-deep outline-none px-4 py-3 text-sm text-ink font-sans normal-case tracking-normal"
        />
      </label>
      <label className="mt-4 block label-nav text-[10px] text-metal-ink mb-2">
        {whatsappLabel}
        <input
          type="tel"
          required
          placeholder="+977 98X-XXX-XXXX"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="mt-2 w-full bg-bone rounded-input border border-line focus:border-metal-deep outline-none px-4 py-3 text-sm text-ink font-sans normal-case tracking-normal"
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
        {state === "submitting" ? "…" : buttonLabel}
      </button>
      <p className="mt-4 text-[11px] text-ink-soft text-center">
        {finePrint}
      </p>
    </form>
  );
}

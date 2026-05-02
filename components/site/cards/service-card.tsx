import Link from "next/link";
import type { Service } from "@/lib/api/types";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";

export function ServiceCard({ service }: { service: Service }) {
  const meta = ELEMENT_BY_SLUG[service.element];
  return (
    <Link
      href={`/energy/${service.slug}`}
      data-element={service.element}
      className="group relative flex bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-colors overflow-hidden"
    >
      <div
        className="w-1 self-stretch transition-all group-hover:w-2"
        style={{ background: meta.accent }}
        aria-hidden
      />
      <div className="flex-1 p-6">
        <p
          className="label-eyebrow mb-2"
          style={{ color: meta.accent }}
        >
          {meta.name} · {service.duration}
        </p>
        <h3 className="font-display text-2xl text-[var(--color-cream)] mb-3 leading-tight">
          {service.name}
        </h3>
        <p className="text-sm text-[var(--color-gold-muted)] mb-4 line-clamp-2">
          {service.summary}
        </p>
        <span className="text-[var(--color-gold)] text-sm">
          Enquire on WhatsApp
        </span>
      </div>
    </Link>
  );
}

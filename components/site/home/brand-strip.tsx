const POINTS = [
  {
    title: "Our Lens, Not Our Limit",
    body: "We curate beyond Nepal — sourcing the right object from the right place, regardless of border.",
  },
  {
    title: "Sourced Globally. Served Globally.",
    body: "Four showrooms in Kathmandu. WhatsApp delivery anywhere a parcel can travel.",
  },
  {
    title: "Rooted in Respect",
    body: "Short chains, fair prices, and the patience that good objects deserve.",
  },
];

export function BrandStrip() {
  return (
    <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">
        {POINTS.map((p, i) => (
          <div
            key={p.title}
            className={`text-center px-6 ${
              i > 0
                ? "md:border-l md:border-[var(--color-border-soft)]"
                : ""
            }`}
          >
            <h3 className="font-display text-2xl text-[var(--color-gold)] mb-3">
              {p.title}
            </h3>
            <p className="text-sm text-[var(--color-gold-muted)] leading-relaxed">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

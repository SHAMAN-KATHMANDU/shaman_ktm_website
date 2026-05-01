import { Button } from "@/components/site/shared/button";

const BENEFITS = [
  { icon: "✦", title: "Member pricing", body: "Standing discount on every order, every time." },
  { icon: "◈", title: "Early access", body: "First look at small-batch arrivals before public listing." },
  { icon: "❖", title: "Showroom invites", body: "Quiet evenings with sound bowls, tea, and the makers." },
];

export function MemberStrip() {
  return (
    <section className="py-20 px-6 md:px-10 border-y border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <div className="mx-auto max-w-[1400px] text-center">
        <p className="label-eyebrow mb-3">Member Threshold · NPR 1,500</p>
        <h2 className="display-heading font-display text-3xl md:text-5xl text-[var(--color-cream)] leading-tight mb-4">
          Become a <em>Shaman Member</em>
        </h2>
        <p className="text-[var(--color-gold-muted)] max-w-xl mx-auto mb-12">
          One purchase past NPR 1,500 enrolls you for life. After that, the
          three things below are yours.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left max-w-3xl mx-auto">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <span className="text-3xl text-[var(--color-gold)] block mb-3">
                {b.icon}
              </span>
              <h3 className="font-display text-xl text-[var(--color-cream)] mb-2">
                {b.title}
              </h3>
              <p className="text-sm text-[var(--color-gold-muted)] leading-relaxed">
                {b.body}
              </p>
            </div>
          ))}
        </div>
        <Button href="/account/register" variant="primary">
          Become a Member
        </Button>
      </div>
    </section>
  );
}

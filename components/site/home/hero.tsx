import Link from "next/link";
import { Button } from "@/components/site/shared/button";

export function Hero() {
  return (
    <section className="hero-bg relative min-h-[calc(100vh-64px)] flex items-center justify-center px-6 overflow-hidden">
      <div className="text-center max-w-4xl relative z-10">
        <p className="label-eyebrow mb-6">Kathmandu, Nepal</p>
        <h1 className="display-heading font-display text-5xl md:text-7xl lg:text-8xl text-[var(--color-cream)] leading-[1.05]">
          Curated in <em>Kathmandu</em>.
          <br />
          From the world. For the world.
        </h1>
        <div className="w-16 h-px bg-[var(--color-gold)] mx-auto my-8" aria-hidden />
        <p className="text-[var(--color-gold-muted)] text-lg md:text-xl">
          Everything in nature carries energy. Discover yours.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/nature" variant="primary" size="lg">
            Explore Nature
          </Button>
          <Button href="/energy" variant="outline" size="lg">
            Book Energy
          </Button>
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-30"
        aria-hidden
      />
      <Link
        href="/stories"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 label-nav text-[10px] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
      >
        Scroll ↓
      </Link>
    </section>
  );
}

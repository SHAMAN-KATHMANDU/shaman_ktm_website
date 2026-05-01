import Link from "next/link";
import { Logo } from "./logo";
import {
  InstagramIcon,
  TikTokIcon,
  WaIcon,
} from "@/components/site/icons";
import { mockShowrooms } from "@/data/mock/showrooms";
import { EMAIL, WA_LINK } from "@/lib/contact";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-gold-muted)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
          <div>
            <Logo size="lg" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed">
              Curated in Kathmandu. From the world. For the world. Four
              showrooms across the valley.
            </p>
            <div className="mt-6 flex items-center gap-4 text-[var(--color-gold-muted)]">
              <a
                href="https://www.instagram.com/shamankathmandu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-[var(--color-gold)]"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="hover:text-[var(--color-gold)]"
              >
                <WaIcon size={18} />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="hover:text-[var(--color-gold)]"
              >
                <TikTokIcon size={18} />
              </a>
            </div>
          </div>

          <div>
            <h5 className="label-eyebrow mb-4">Explore</h5>
            <ul className="space-y-2 text-sm">
              <li><Link href="/nature" className="hover:text-[var(--color-gold)]">Nature</Link></li>
              <li><Link href="/energy" className="hover:text-[var(--color-gold)]">Energy Services</Link></li>
              <li><Link href="/stories" className="hover:text-[var(--color-gold)]">Shaman Stories</Link></li>
              <li><Link href="/bundles" className="hover:text-[var(--color-gold)]">Bundles</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="label-eyebrow mb-4">Support</h5>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pages/about" className="hover:text-[var(--color-gold)]">About</Link></li>
              <li><Link href="/pages/faq" className="hover:text-[var(--color-gold)]">FAQ</Link></li>
              <li><a href={`mailto:${EMAIL}`} className="hover:text-[var(--color-gold)]">Contact</a></li>
              <li><a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-gold)]">WhatsApp</a></li>
            </ul>
          </div>

          <div>
            <h5 className="label-eyebrow mb-4">Showrooms</h5>
            <ul className="space-y-3 text-xs leading-relaxed">
              {mockShowrooms.map((s) => (
                <li key={s.key}>
                  <strong className="block text-[var(--color-cream)] text-sm font-normal mb-0.5">
                    {s.name}
                  </strong>
                  <span>{s.address}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--color-border-soft)] text-xs">
          <p className="font-display italic text-[var(--color-cream)] text-base mb-6">
            &ldquo;Nature does not carry a passport. Neither do we.&rdquo;
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span>© {new Date().getFullYear()} Shaman Kathmandu</span>
            <div className="flex gap-5">
              <Link href="/pages/privacy" className="hover:text-[var(--color-gold)]">Privacy</Link>
              <Link href="/pages/terms" className="hover:text-[var(--color-gold)]">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

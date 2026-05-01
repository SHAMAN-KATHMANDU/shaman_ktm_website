import { WA_LINK } from "@/lib/contact";
import { WaIcon } from "@/components/site/icons";

export function WhatsAppFloat() {
  const href = `${WA_LINK}?text=${encodeURIComponent(
    "Hi! I'd like to ask about Shaman Kathmandu",
  )}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-gold)] text-[var(--color-base)] shadow-lg hover:scale-105 transition-transform"
      title="Order on WhatsApp"
      aria-label="Order on WhatsApp"
    >
      <WaIcon size={26} />
    </a>
  );
}

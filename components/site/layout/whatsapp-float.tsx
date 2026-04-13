import { WA_LINK } from "@/lib/contact";
import { WaIcon } from "../icons";

export function WhatsAppFloat() {
  const href = `${WA_LINK}?text=${encodeURIComponent(
    "Hi! I'd like to order from Shaman Kathmandu",
  )}`;
  return (
    <a
      href={href}
      className="sk-wa-float"
      target="_blank"
      rel="noopener noreferrer"
      title="Order on WhatsApp"
      aria-label="Order on WhatsApp"
    >
      <WaIcon size={25} />
    </a>
  );
}

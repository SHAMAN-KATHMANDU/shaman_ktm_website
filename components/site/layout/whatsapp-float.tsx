import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { WA_LINK } from "@/lib/contact";
import { WaIcon } from "@/components/site/icons";

export async function WhatsAppFloat({ label }: { label?: string }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const defaultLabel = label ?? t.whatsapp.enquire;
  const defaultMessage = t.whatsapp.defaultMessage;
  const href = `${WA_LINK}?text=${encodeURIComponent(defaultMessage)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-13 h-13 bg-accent-deep text-bone shadow-lift outline outline-1 outline-bone/40 -outline-offset-4 transition-[transform,background-color] duration-500 ease-lux hover:-translate-y-0.5 hover:bg-accent"
      title={defaultLabel}
      aria-label={defaultLabel}
    >
      <WaIcon size={26} />
    </a>
  );
}

import { permanentRedirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { localizeHref } from "@/lib/i18n/locale";

// The standalone Nature page is retired — the six-element taxonomy now lives
// on /products as selectable element chips. 308 the old URL there for SEO.
export default async function NaturePage() {
  const locale = await getLocale();
  permanentRedirect(localizeHref("/products", locale));
}

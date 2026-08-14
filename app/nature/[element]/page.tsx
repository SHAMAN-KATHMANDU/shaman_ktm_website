import { permanentRedirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { localizeHref } from "@/lib/i18n/locale";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";

interface Props {
  params: Promise<{ element: string }>;
}

// The per-element Nature pages are retired — element browsing now happens via
// the ?element= chips on /products. 308 known slugs onto the filtered listing;
// anything else falls back to the unfiltered catalog.
export default async function ElementPage({ params }: Props) {
  const { element } = await params;
  const locale = await getLocale();
  const target =
    element in ELEMENT_BY_SLUG ? `/products?element=${element}` : "/products";
  permanentRedirect(localizeHref(target, locale));
}

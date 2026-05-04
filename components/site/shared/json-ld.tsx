// Renders a JSON-LD <script> tag inline. Search engines parse this for rich
// results — product cards, breadcrumb trails, article author/publish dates.

interface Props {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify with no replacer is safe — keys/values are server-side
      // strings. </script> protection: replace any literal "</" so closing
      // tags inside string values don't break out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

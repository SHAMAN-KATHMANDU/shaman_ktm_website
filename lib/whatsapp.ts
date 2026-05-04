import { WA_NUMBER } from "@/lib/contact";

export interface EnquireParams {
  productName?: string;
  productUrl?: string;
  serviceName?: string;
  message?: string;
}

export interface WhatsappTemplates {
  /** Default: "Hi, I'm interested in: {productName}\n{productUrl}" */
  product?: string;
  /** Default: "Hi, I'd like to book: {serviceName}" */
  service?: string;
  /** Default: "Hi, I'd like to ask about Shaman Kathmandu." */
  generic?: string;
}

const DEFAULT_TEMPLATES: Required<WhatsappTemplates> = {
  product: "Hi, I'm interested in: {productName}\n{productUrl}",
  service: "Hi, I'd like to book: {serviceName}",
  generic: "Hi, I'd like to ask about Shaman Kathmandu.",
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? vars[key] : "",
  );
}

export function buildEnquireUrl(
  params: EnquireParams = {},
  templates: WhatsappTemplates = {},
): string {
  const t = { ...DEFAULT_TEMPLATES, ...templates };
  let body: string;

  if (params.productName) {
    body = interpolate(t.product, {
      productName: params.productName,
      productUrl: params.productUrl ?? "",
    }).replace(/\n+$/, "");
  } else if (params.serviceName) {
    body = interpolate(t.service, { serviceName: params.serviceName });
  } else if (params.message) {
    body = params.message;
  } else {
    body = t.generic;
  }

  const text = encodeURIComponent(body);
  return `https://wa.me/${WA_NUMBER}?text=${text}`;
}

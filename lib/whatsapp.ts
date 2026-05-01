import { WA_NUMBER } from "@/lib/contact";

export interface EnquireParams {
  productName?: string;
  productUrl?: string;
  serviceName?: string;
  message?: string;
}

export function buildEnquireUrl(params: EnquireParams = {}): string {
  const lines: string[] = [];
  if (params.productName) {
    lines.push(`Hi, I'm interested in: ${params.productName}`);
    if (params.productUrl) lines.push(params.productUrl);
  } else if (params.serviceName) {
    lines.push(`Hi, I'd like to book: ${params.serviceName}`);
  } else if (params.message) {
    lines.push(params.message);
  } else {
    lines.push("Hi, I'd like to ask about Shaman Kathmandu.");
  }
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WA_NUMBER}?text=${text}`;
}

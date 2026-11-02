// Controlled vocabulary for the sales spine.

export const SALE_CHANNELS = [
  "online", // website order (auto-bridged in PR 4)
  "showroom", // walk-in at Thamel / Gongabu
  "wholesale_b2b", // trade sale against a B2B account (PR 5)
  "event", // fair, exhibition, pop-up
] as const;

export type SaleChannel = (typeof SALE_CHANNELS)[number];

export const SALE_STATUSES = [
  "draft", // recorded, touches no stock, still editable
  "confirmed", // stock decremented; IMMUTABLE from here on
  "void", // superseded by a reversing sale
] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SALE_INPUT_SOURCES = ["telegram", "web_form", "import"] as const;

export type SaleInputSource = (typeof SALE_INPUT_SOURCES)[number];

export const SALE_STAFF_ROLES = ["sold_by", "assisted", "delivered"] as const;

export type SaleStaffRole = (typeof SALE_STAFF_ROLES)[number];

export function isSaleChannel(v: string): v is SaleChannel {
  return (SALE_CHANNELS as readonly string[]).includes(v);
}

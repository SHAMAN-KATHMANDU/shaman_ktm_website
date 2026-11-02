// Controlled vocabulary for the B2B module.

export const B2B_ACCOUNT_TYPES = [
  "hotel",
  "spa",
  "interior",
  "retailer",
  "exporter",
  "other",
] as const;

export type B2bAccountType = (typeof B2B_ACCOUNT_TYPES)[number];

export const B2B_ACCOUNT_STATUSES = [
  "prospect", // no order yet
  "active", // ordering
  "dormant", // was active, gone quiet
  "lost", // explicitly gone
] as const;

export type B2bAccountStatus = (typeof B2B_ACCOUNT_STATUSES)[number];

// Verbatim from the existing Shrawan target list, so old sheets map across.
export const B2B_DEAL_STAGES = [
  "contacted",
  "meeting_set",
  "samples_sent",
  "quoted",
  "negotiating",
  "won",
  "lost",
  "deferred",
] as const;

export type B2bDealStage = (typeof B2B_DEAL_STAGES)[number];

// Closed stages: the deal is finished either way. Reopening is deliberate and
// goes through reopenDeal(), which records the move as its own dated row —
// same rule the CRM statuses follow.
export const B2B_CLOSED_STAGES: readonly B2bDealStage[] = ["won", "lost"];

export function isDealStage(v: string): v is B2bDealStage {
  return (B2B_DEAL_STAGES as readonly string[]).includes(v);
}

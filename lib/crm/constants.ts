// Controlled vocabulary for CRM leads, as the client defines the terms.

export const LEAD_STATUSES = [
  "new", // raw inflow, not yet triaged — keeps a day's intake countable
  "hot", // actively talking
  "warm", // conversation started, not finalised
  "cold", // no reply
  "purchase", // converted; links to a sale
  "dnc", // do not contact
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_INTERESTS = [
  "retail",
  "wholesale_b2b", // converts/links to a B2B account (PR 5)
  "custom_order",
] as const;

export type LeadInterest = (typeof LEAD_INTERESTS)[number];

export const FOLLOWUP_CHANNELS = [
  "whatsapp",
  "call",
  "sms",
  "messenger",
  "instagram",
  "in_person",
] as const;

export type FollowupChannel = (typeof FOLLOWUP_CHANNELS)[number];

// Terminal statuses: a lead that converted or opted out is not re-triaged. Any
// other status can move to any other — real conversations don't run a funnel in
// order (a cold lead can go hot months later), so only the terminals are fixed.
// Reopening is deliberate and explicit: it needs its own status change from the
// terminal state, which the history records.
export const TERMINAL_STATUSES: readonly LeadStatus[] = ["purchase", "dnc"];

export function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isLeadInterest(v: string): v is LeadInterest {
  return (LEAD_INTERESTS as readonly string[]).includes(v);
}

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

// The shape a lead's phone number has to have, wherever it is typed — the web
// form, the admin panel, or the leads bot. Deliberately loose about separators
// (people write 98xx-xxx-xxx, +977 98xx …) and strict about length, because a
// number is how a lead is recognised again later.
export const LEAD_PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

/**
 * Reduce a number to the form two spellings of it share, so an existing lead
 * can be recognised. Used for comparison only — never to rewrite what someone
 * typed, which stays on the record as they wrote it.
 *
 * Separators go, and so does a Nepali country code: staff write "+977 98…",
 * "977-98…" and "98…" for the same person, and a plain string comparison would
 * file that person three times. The lookahead means a short number that merely
 * begins 977 is left alone.
 */
export function normalizeLeadPhone(phone: string): string {
  const compact = phone.replace(/[ ()-]/g, "");
  return compact.replace(/^(\+?977)(?=\d{9,})/, "");
}

export function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isLeadInterest(v: string): v is LeadInterest {
  return (LEAD_INTERESTS as readonly string[]).includes(v);
}

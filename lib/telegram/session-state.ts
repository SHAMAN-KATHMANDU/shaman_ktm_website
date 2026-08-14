// Typed shape of TelegramSession.state (Json column). Created in PR 1 so the
// bot PRs (7–8) mutate session state with compile-time safety instead of
// bare Json casts.

export type TelegramFlow = "sale" | "lead";

export type SaleStep =
  | "picking_showroom" // floaters only (Staff.defaultShowroomKey == null)
  | "awaiting_qr"
  | "picking_variation"
  | "picking_qty"
  | "asking_more_items"
  | "asking_payment_method"
  | "asking_payment_screenshot" // decision #9: bot explicitly asks
  | "confirming_draft"
  | "done";

export type LeadStep =
  | "picking_showroom"
  | "collecting_name"
  | "collecting_phone"
  | "collecting_source"
  | "collecting_interest"
  | "collecting_status"
  // "Are they coming in?" — one tap that answers askedLocation AND willVisit,
  // then an optional date. Both are spec fields; asking them separately would
  // add two prompts to a form someone is filling in on a phone mid-shift.
  | "collecting_visit"
  | "collecting_visit_date"
  | "collecting_evidence"
  | "confirming_details"
  | "done";

export interface SaleSessionItem {
  productId: string;
  variationId?: string;
  qty: number;
}

export interface TelegramSessionState {
  flow: TelegramFlow;
  step: SaleStep | LeadStep;
  /** Resolved showroom for this entry (staff default or explicit pick). */
  showroomKey?: string;
  // ── /sale flow ──
  items?: SaleSessionItem[];
  /** Product currently being detailed (variation/qty pending). */
  pendingProductId?: string;
  /** Variation chosen for the pending product, awaiting a quantity. */
  pendingVariationId?: string;
  draftSaleId?: string;
  paymentMethodId?: string;
  paymentScreenshotUrl?: string;
  // ── /lead flow ──
  leadName?: string;
  leadPhone?: string;
  leadPhoneAlt?: string;
  leadEmail?: string;
  leadSourceId?: string;
  leadInterest?: "retail" | "wholesale_b2b" | "custom_order";
  leadStatus?: "new" | "hot" | "warm" | "cold";
  leadEvidenceUrl?: string;
  /** Free-text note typed instead of (or as well as) a screenshot. */
  notesDraft?: string;
  leadAskedLocation?: boolean;
  leadWillVisit?: boolean;
  /** ISO date string — the session is a Json column, so it holds no Dates. */
  leadVisitDate?: string;
  /**
   * An open lead already on file for this number, spotted before the record is
   * written. Carried so the confirm step can offer to log a follow-up against
   * it instead of creating the second row that would inflate the day's count.
   */
  duplicateLeadId?: string;
}

/** Narrowing helper: parse the Json column into the typed state. */
export function parseSessionState(raw: unknown): TelegramSessionState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<TelegramSessionState>;
  if (s.flow !== "sale" && s.flow !== "lead") return null;
  if (typeof s.step !== "string") return null;
  return s as TelegramSessionState;
}

// The identifier a product/variation carries in the Meta catalog, shared by
// the product feed AND every pixel event so interactions match catalog items.
//
// A product with variations exposes one catalog item per variation (id = the
// variation id, which is globally unique); those items are linked by an
// item_group_id = the product slug. A product with no variations is a single
// catalog item keyed by its slug. This function is the single source of that
// rule — it must stay pure and client-safe (imported by both the server feed
// and client pixel calls).

export function catalogItemId(
  slug: string,
  variationId?: string | null,
): string {
  return variationId || slug;
}

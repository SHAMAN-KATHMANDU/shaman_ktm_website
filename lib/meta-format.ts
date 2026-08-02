// Client-safe (no node APIs) — shared by the product feed, product page
// microdata and anything else that renders a price for a Meta surface.

/**
 * Meta surfaces (feed <g:price>, og product:price:amount) require 2-decimal
 * price strings. Prices are integers in whole NPR rupees: 4500 → "4500.00".
 */
export function formatMetaPrice(price: number): string {
  return price.toFixed(2);
}

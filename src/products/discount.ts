import type { PricingMeta, Product } from './types'

// Display-only: a discount never changes the stored price.
export function discountedPrice(sitePrice: number, discountPercent: number): number {
  return Math.round(sitePrice * (1 - discountPercent / 100) * 100) / 100
}

// Profit rate (profit ÷ price excl. VAT) the owner would keep if the product sold for `finalPrice`.
// Same structure as the server formula: VAT is carved out of the final price and the card fee is
// charged on it; the cost already includes the fixed-expense factor.
export function profitRateAt(product: Product, meta: PricingMeta, finalPrice: number): number | null {
  if (!product.price) return null
  const priceExclVat = finalPrice / (1 + meta.vatRate)
  if (priceExclVat <= 0) return null
  const profit = priceExclVat - product.price.costWithFixedExpenses - finalPrice * meta.cardFeeRate
  return profit / priceExclVat
}

export function isBelowProfitFloor(product: Product, meta: PricingMeta | null, finalPrice: number): boolean {
  if (!meta) return false
  const rate = profitRateAt(product, meta, finalPrice)
  return rate !== null && rate * 100 < meta.profitFloorPercent
}

import type { PricingMeta, Product } from './types'

// Display-only: a discount never changes the stored price.
export function discountedPrice(sitePrice: number, discountPercent: number): number {
  return Math.round(sitePrice * (1 - discountPercent / 100) * 100) / 100
}

export type Profit = { amount: number; rate: number }

// What the owner would keep if the product sold for `finalPrice` (VAT included): the amount in
// shekels and the rate (profit ÷ price excl. VAT). Same structure as the server formula: VAT is
// carved out of the final price and the card fee is charged on it; the cost already includes the
// fixed-expense factor.
export function profitAt(product: Product, meta: PricingMeta, finalPrice: number): Profit | null {
  if (!product.price) return null
  const priceExclVat = finalPrice / (1 + meta.vatRate)
  if (priceExclVat <= 0) return null
  const amount = priceExclVat - product.price.costWithFixedExpenses - finalPrice * meta.cardFeeRate
  return { amount, rate: amount / priceExclVat }
}

export function profitRateAt(product: Product, meta: PricingMeta, finalPrice: number): number | null {
  return profitAt(product, meta, finalPrice)?.rate ?? null
}

export function isBelowProfitFloor(product: Product, meta: PricingMeta | null, finalPrice: number): boolean {
  if (!meta) return false
  const rate = profitRateAt(product, meta, finalPrice)
  return rate !== null && rate * 100 < meta.profitFloorPercent
}

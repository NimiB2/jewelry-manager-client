export type Addition = {
  typeName: string
  customName: string | null
  price: number
  quantity: number
}

export type PriceBreakdown = {
  metalCost: number
  laborHours: number
  laborCost: number
  additionsCost: number
  packagingAndShippingCost: number
  directCosts: number
  costWithFixedExpenses: number
  priceExclVat: number
  recommendedPrice: number
  cardFeeCost: number
  profit: number
  profitRate: number
  // The inputs behind the numbers, used to show each formula with its real values.
  weight: number
  pricePerGram: number
  laborHourRate: number
  fixedExpenseRate: number
  profitMultiplier: number
  cardFeeRate: number
  vatRate: number
}

export type Product = {
  id: string
  type: string
  name: string
  material: string
  weight: number
  additionalWorkHours: number
  sitePrice: number
  additions: Addition[]
  collectionIds: string[]
  // Null when the price can't be computed (priceError says why) — the product is still listed.
  price: PriceBreakdown | null
  priceError: string | null
  // The product's name in the online store, and what the store offers for it (one entry per variant).
  shopifyName: string | null
  shopifyVariants: ShopifyVariant[]
  // True while the type or the material is missing (a product imported from the store).
  needsDetails: boolean
}

export type ShopifyVariant = {
  title: string
  price: number
  sku: string | null
}

export type PricingMeta = {
  vatRate: number
  cardFeeRate: number
  profitFloorPercent: number
}

export type ProductsList = {
  products: Product[]
  pricing: PricingMeta | null
}

export type Collection = {
  id: string
  name: string
  isPermanent: boolean
  key: string | null
}

export type SaveProductBody = {
  type: string
  name: string
  material: string
  weight: number
  additionalWorkHours: number
  sitePrice: number
  additions: Addition[]
  collectionIds: string[]
  // Empty text clears the store name; leaving it out keeps it.
  shopifyName?: string
}

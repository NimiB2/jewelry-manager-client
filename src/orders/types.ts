export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'READY' | 'COMPLETED'

export type OrderSource = 'MANUAL' | 'SHOPIFY'

export type OrderItem = {
  id: string
  // Null once the catalog product was deleted; the line keeps its frozen name and price.
  productId: string | null
  name: string
  type: string
  material: string
  unitPrice: number
  quantity: number
  lineTotal: number
  workHours: number
}

export type Order = {
  id: string
  number: number
  isTest: boolean
  date: string
  customer: string | null
  amount: number
  finalAmount: number
  hasDiscount: boolean
  discountAmount: number
  discountPercent: number
  discountReason: string | null
  source: OrderSource
  receiptSent: boolean
  status: OrderStatus
  preparationStage: string | null
  notes: string | null
  isCompleted: boolean
  completedDate: string | null
  items: OrderItem[]
}

export type OrdersList = {
  orders: Order[]
  summary: { count: number; totalFinalAmount: number }
}

export type OrderItemInput = {
  lineId: string | null
  productId: string | null
  quantity: number
  unitPrice: number | null
}

export type SaveOrderBody = {
  customer: string | null
  date: string
  notes: string | null
  items: OrderItemInput[]
  discount: { mode: 'PERCENT' | 'FINAL_AMOUNT'; value: number; reason: string | null } | null
}

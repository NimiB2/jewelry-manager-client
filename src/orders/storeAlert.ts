import type { Order, StoreAlert } from './types'

// Short label, used on cards and in the list.
export const STORE_ALERT_LABEL: Record<Exclude<StoreAlert, 'NONE'>, string> = {
  CANCELLED: 'בוטלה בחנות',
  DELETED: 'נמחקה בחנות',
  UPDATED: 'עודכנה בחנות',
}

export function hasStoreAlert(order: Order): boolean {
  return order.storeAlert !== undefined && order.storeAlert !== 'NONE'
}

// A cancelled or deleted order cannot be approved until the warning is dismissed.
export function blocksApproval(order: Order): boolean {
  return order.storeAlert === 'CANCELLED' || order.storeAlert === 'DELETED'
}

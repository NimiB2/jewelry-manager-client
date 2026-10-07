import type { CSSProperties } from 'react'
import type { OrderStatus } from './types'

export const STATUS_ORDER: OrderStatus[] = ['NEW', 'IN_PROGRESS', 'READY', 'COMPLETED']

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'חדשה',
  IN_PROGRESS: 'בהכנה',
  READY: 'מוכנה',
  COMPLETED: 'הושלמה',
}

// One clear color per status, so the state is readable at a glance.
const STATUS_COLORS: Record<OrderStatus, { background: string; color: string }> = {
  NEW: { background: 'var(--accent-bg)', color: 'var(--accent)' },
  IN_PROGRESS: { background: 'var(--warning-bg)', color: 'var(--warning)' },
  READY: { background: 'var(--ready-bg)', color: 'var(--ready)' },
  // Finished orders are a success: green, like the check mark that goes with them.
  COMPLETED: { background: 'var(--success-bg)', color: 'var(--success)' },
}

export function statusPillStyle(status: OrderStatus): CSSProperties {
  return {
    ...STATUS_COLORS[status],
    display: 'inline-block',
    padding: '1px 10px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
  }
}

export function statusColors(status: OrderStatus) {
  return STATUS_COLORS[status]
}

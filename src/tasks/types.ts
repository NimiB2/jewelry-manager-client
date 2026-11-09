import type { OrderStatus } from '../orders/types'

export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED'

export type Task = {
  id: string
  title: string
  content: string | null
  status: TaskStatus
  // Optional: a task can stand alone.
  orderId: string | null
  orderNumber: number | null
  orderCustomer: string | null
  createdAt: string
  completedAt: string | null
  // Made by the system for an order: it shows the order's status and is changed only through the order.
  isAutomatic: boolean
  orderStatus: OrderStatus | null
  // One of her task categories (general tasks only, optional).
  category: string | null
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['NEW', 'IN_PROGRESS', 'COMPLETED']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'חדשה',
  IN_PROGRESS: 'בביצוע',
  COMPLETED: 'הושלמה',
}

// What one tap on the card's main button does.
export const NEXT_TASK_STATUS: Partial<Record<TaskStatus, { status: TaskStatus; label: string }>> = {
  NEW: { status: 'IN_PROGRESS', label: 'התחלת ביצוע ←' },
  IN_PROGRESS: { status: 'COMPLETED', label: 'סימון כהושלמה ✓' },
}

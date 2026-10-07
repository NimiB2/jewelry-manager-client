import { apiJson } from '../api'
import { formatMoney } from '../products/format'
import { periodRange } from './dates'
import type { Order, OrdersList } from './types'

// The message shown when an order is completed: praise, plus what she has achieved this month so
// far. If the month's numbers can't be fetched, the praise alone is shown.
export async function completionMessage(order: Order): Promise<string[]> {
  const who = order.customer ? `ההזמנה של ${order.customer} הושלמה` : `הזמנה #${order.number} הושלמה`
  const lines = ['כל הכבוד! 🎉', who]

  try {
    const now = new Date()
    const range = periodRange(now.getFullYear(), now.getMonth() + 1)!
    const params = new URLSearchParams({ status: 'completed', from: range.from, to: range.to })
    const { summary } = await apiJson<OrdersList>(`/orders?${params}`)
    if (summary.count > 0) {
      lines.push(
        `החודש הושלמו ${summary.count} ${summary.count === 1 ? 'הזמנה' : 'הזמנות'} בסך ${formatMoney(summary.totalFinalAmount)}`,
      )
    }
  } catch {
    // the praise stands on its own
  }

  return lines
}

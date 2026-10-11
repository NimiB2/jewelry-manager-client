import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '../api'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle, secondaryButtonStyle } from '../products/productStyles'
import { navigate } from '../shell/useRoute'
import { formatOrderDate } from './dates'
import { StoreAlertNotice } from './StoreAlertNotice'
import type { Order } from './types'

type AlertedOrdersProps = {
  // Called after a warning was dismissed, so the regular list reloads too.
  onChanged: () => void
}

// Orders that are already on the books and that the store later cancelled, deleted or changed. They stay
// here, whatever filter the list below uses, until she has looked at them and dismissed the warning.
export function AlertedOrders({ onChanged }: AlertedOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setOrders(await apiJson<Order[]>('/orders/alerts'))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load()
    const onVisible = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  if (orders.length === 0 && !error) return null

  return (
    <section aria-label="הזמנות שהחנות שינתה" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
        החנות שינתה {orders.length === 1 ? 'הזמנה אחת' : `${orders.length} הזמנות`}
      </h2>
      {error && <p style={errorTextStyle}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map((order) => (
          <article key={order.id} style={{ ...cardStyle, border: '1px solid var(--danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{order.customer ?? 'ללא שם לקוחה'}</div>
                <div style={mutedTextStyle}>
                  #{order.number} · {formatOrderDate(order.date)}
                  {order.externalName ? ` · ${order.externalName} בחנות` : ''}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{formatMoney(order.finalAmount)}</div>
            </div>

            <StoreAlertNotice
              order={order}
              onChanged={() => {
                void load()
                onChanged()
              }}
            />

            <button
              type="button"
              onClick={() => navigate(`/orders/${order.id}`)}
              style={{ ...secondaryButtonStyle, minHeight: 36, marginTop: 8 }}
            >
              פתיחת ההזמנה
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

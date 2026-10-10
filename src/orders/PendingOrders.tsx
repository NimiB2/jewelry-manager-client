import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import type { Product } from '../products/types'
import { ProductPicker } from './ProductPicker'
import type { Order } from './types'

type PendingOrdersProps = {
  // Called after an order was approved or rejected, so the regular list reloads.
  onChanged: () => void
}

type Conflict = { orderId: string; lineId: string; productId: string; message: string }

// Orders that arrived from the online store. Each line is either recognised or waits for her to pick
// the product from her own list (which also teaches the match for next time); only a fully recognised
// order can be approved, and then it becomes a regular order.
export function PendingOrders({ onChanged }: PendingOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState<{ orderId: string; lineId: string } | null>(null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setOrders(await apiJson<Order[]>('/orders/pending'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load()
    // A store order may arrive while the screen is open in another tab or on the phone.
    const onVisible = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  async function link(orderId: string, lineId: string, productId: string, replace = false) {
    setBusy(true)
    setError(null)
    setConflict(null)
    try {
      await apiJson<Order>(`/orders/${orderId}/items/${lineId}/product`, {
        method: 'PUT',
        body: JSON.stringify({ productId, replace }),
      })
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setConflict({ orderId, lineId, productId, message: err.message })
      else setError(err instanceof Error ? err.message : 'הקישור נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function approve(orderId: string) {
    setBusy(true)
    setError(null)
    try {
      await apiJson<Order>(`/orders/${orderId}/approve`, { method: 'POST' })
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'האישור נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function reject(orderId: string) {
    setBusy(true)
    setError(null)
    try {
      await apiJson<void>(`/orders/${orderId}`, { method: 'DELETE' })
      setRejecting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המחיקה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (orders.length === 0 && !error) return null

  return (
    <section aria-label="הזמנות ממתינות לאישור" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>
        ממתינות לאישור <span style={countStyle}>{orders.length}</span>
      </h2>
      {error && <p style={errorTextStyle}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map((order) => {
          const unmatched = order.items.filter((i) => i.needsProduct).length

          return (
            <article key={order.id} style={{ ...cardStyle, border: '1px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {order.externalName ?? `הזמנה ${order.number}`}
                    {order.customer ? ` · ${order.customer}` : ''}
                  </div>
                  <div style={mutedTextStyle}>מהחנות · {order.date}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{formatMoney(order.finalAmount)}</div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.items.map((line) => (
                  <li key={line.id} style={lineStyle(line.needsProduct === true)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {line.name} × {line.quantity}
                      </div>
                      <div style={mutedTextStyle}>
                        {formatMoney(line.unitPrice)}
                        {line.note ? ` · ${line.note}` : ''}
                      </div>
                    </div>

                    {line.needsProduct ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPicking({ orderId: order.id, lineId: line.id })}
                        style={pickButtonStyle}
                      >
                        בחירת מוצר
                      </button>
                    ) : (
                      <span style={{ color: 'var(--success)', fontSize: 14, whiteSpace: 'nowrap' }}>✓ זוהה</span>
                    )}

                    {conflict?.orderId === order.id && conflict.lineId === line.id && (
                      <div role="alert" style={warningStyle}>
                        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{conflict.message}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void link(order.id, line.id, conflict.productId, true)}
                            style={{ ...primaryButtonStyle, minHeight: 40 }}
                          >
                            כן, להחליף
                          </button>
                          <button type="button" onClick={() => setConflict(null)} style={secondaryButtonStyle}>
                            בחירת מוצר אחר
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {unmatched > 0 && (
                <p style={{ ...mutedTextStyle, margin: '8px 0 0' }}>
                  {unmatched === 1 ? 'פריט אחד עדיין לא זוהה' : `${unmatched} פריטים עדיין לא זוהו`}. אחרי שיזוהו אפשר לאשר.
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  disabled={busy || unmatched > 0}
                  onClick={() => void approve(order.id)}
                  style={{ ...primaryButtonStyle, flex: 1, opacity: unmatched > 0 ? 0.5 : 1 }}
                >
                  אישור ההזמנה
                </button>

                {rejecting === order.id ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => void reject(order.id)} style={dangerButtonStyle}>
                      למחוק?
                    </button>
                    <button type="button" onClick={() => setRejecting(null)} style={secondaryButtonStyle}>
                      ביטול
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setRejecting(order.id)} style={secondaryButtonStyle}>
                    דחייה
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {picking && (
        <ProductPicker
          onClose={() => setPicking(null)}
          onPick={(product: Product) => {
            const target = picking
            setPicking(null)
            void link(target.orderId, target.lineId, product.id)
          }}
        />
      )}
    </section>
  )
}

const countStyle: React.CSSProperties = {
  display: 'inline-block',
  minWidth: 22,
  padding: '0 7px',
  borderRadius: 11,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 13,
  textAlign: 'center',
}

function lineStyle(needsProduct: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: needsProduct ? '#fff7e0' : 'var(--bg)',
    border: needsProduct ? '1px solid #e8c964' : '1px solid transparent',
  }
}

const pickButtonStyle: React.CSSProperties = {
  minHeight: 38,
  padding: '0 14px',
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  border: 'none',
  borderRadius: 10,
  background: 'var(--danger)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

const warningStyle: React.CSSProperties = {
  flexBasis: '100%',
  padding: 12,
  borderRadius: 10,
  background: '#fff7e0',
  border: '1px solid #e8c964',
  color: '#5c4a00',
  fontSize: 14,
}

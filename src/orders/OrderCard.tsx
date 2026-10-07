import { useState } from 'react'
import { apiJson } from '../api'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle } from '../products/productStyles'
import { ConfirmInline } from './ConfirmInline'
import { formatOrderDate } from './dates'
import { SourceBadge } from './SourceBadge'
import { StageChips } from './StageChips'
import { STATUS_LABELS, STATUS_ORDER, statusColors, statusPillStyle } from './status'
import type { Order, OrderStatus } from './types'

type OrderCardProps = {
  order: Order
  // The preparation stages from settings, for jumping straight to one.
  stages: string[]
  onOpen: () => void
  // Called after a change made from the card, so the list can reload.
  onChanged: () => void
}

// What one tap on the main button does: move the order to the next status.
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  NEW: { status: 'IN_PROGRESS', label: 'התחלת הכנה ←' },
  IN_PROGRESS: { status: 'READY', label: 'סימון כמוכנה ←' },
  READY: { status: 'COMPLETED', label: 'סיום ההזמנה ✓' },
}

// Customer and amount first; below, small marks: status, source, and whether the receipt was sent.
// Moving the order forward (status, stage) and the receipt all work right from the card.
export function OrderCard({ order, stages, onOpen, onChanged }: OrderCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choosingStatus, setChoosingStatus] = useState(false)
  const [confirmingComplete, setConfirmingComplete] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = (status: OrderStatus) =>
    run(() => apiJson(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))

  // Completing locks the order, so it always asks first; every other move happens at once.
  function requestStatus(status: OrderStatus) {
    setChoosingStatus(false)
    if (status === order.status) return
    if (status === 'COMPLETED') {
      setConfirmingComplete(true)
      return
    }
    void setStatus(status)
  }

  async function confirmComplete() {
    setConfirmingComplete(false)
    await setStatus('COMPLETED')
  }

  const advanceStage = () => run(() => apiJson(`/orders/${order.id}/advance-stage`, { method: 'POST' }))
  const pickStage = (stage: string) =>
    run(() => apiJson(`/orders/${order.id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }))
  const toggleReceipt = () =>
    run(() =>
      apiJson(`/orders/${order.id}/receipt-sent`, {
        method: 'PATCH',
        body: JSON.stringify({ receiptSent: !order.receiptSent }),
      }),
    )

  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const next = NEXT_STATUS[order.status]
  const hasStages = stages.length > 0

  return (
    <article style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <button type="button" onClick={onOpen} style={openButtonStyle} aria-label={`פתיחת הזמנה ${order.number}`}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{order.customer ?? 'ללא שם לקוחה'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            #{order.number} · {formatOrderDate(order.date)} · {itemsCount} {itemsCount === 1 ? 'פריט' : 'פריטים'}
          </span>
        </button>

        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(order.finalAmount)}</div>
          {order.hasDiscount && (
            <div style={mutedTextStyle}>
              <span style={{ textDecoration: 'line-through' }}>{formatMoney(order.amount)}</span> · הנחה {order.discountPercent}%
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setChoosingStatus((v) => !v)}
          disabled={busy}
          aria-expanded={choosingStatus}
          title="בחירת סטטוס אחר"
          style={{ ...statusPillStyle(order.status), border: '1px solid transparent', minHeight: 26, cursor: 'pointer' }}
        >
          {STATUS_LABELS[order.status]} ▾
        </button>
        <SourceBadge source={order.source} />
        {order.isTest && <span style={testTagStyle}>בדיקה</span>}
        <button
          type="button"
          onClick={toggleReceipt}
          disabled={busy}
          aria-pressed={order.receiptSent}
          title="לחיצה משנה את הסימון"
          style={order.receiptSent ? receiptSentStyle : receiptMissingStyle}
        >
          {order.receiptSent ? '✓ קבלה נשלחה' : 'קבלה לא נשלחה'}
        </button>
      </div>

      {choosingStatus && (
        <div style={statusChoiceStyle} role="group" aria-label="בחירת סטטוס">
          {STATUS_ORDER.map((status) => {
            const active = order.status === status
            const colors = statusColors(status)
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => requestStatus(status)}
                style={{
                  flex: 1,
                  minHeight: 38,
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                  border: `1px solid ${active ? colors.color : 'var(--border)'}`,
                  background: active ? colors.background : 'var(--surface)',
                  color: active ? colors.color : 'var(--text)',
                }}
              >
                {STATUS_LABELS[status]}
              </button>
            )
          })}
        </div>
      )}

      {confirmingComplete && (
        <ConfirmInline
          message="לסמן את ההזמנה כהושלמה? היא תינעל לעריכה."
          confirmLabel="כן, להשלים"
          busy={busy}
          onConfirm={confirmComplete}
          onCancel={() => setConfirmingComplete(false)}
        />
      )}

      {order.status === 'IN_PROGRESS' && hasStages && (
        <div style={{ ...footerStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageChips stages={stages} current={order.preparationStage} disabled={busy} onPick={pickStage} />
          <button type="button" onClick={advanceStage} disabled={busy} style={nextButtonStyle}>
            לשלב הבא ←
          </button>
        </div>
      )}

      {next && !(order.status === 'IN_PROGRESS' && hasStages) && !confirmingComplete && (
        <div style={footerStyle}>
          <button type="button" onClick={() => requestStatus(next.status)} disabled={busy} style={nextButtonStyle}>
            {next.label}
          </button>
        </div>
      )}

      {error && <p style={{ ...errorTextStyle, marginTop: 6 }}>{error}</p>}
    </article>
  )
}

const openButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  border: 'none',
  background: 'transparent',
  padding: 0,
  textAlign: 'right',
  cursor: 'pointer',
  flex: 1,
  minWidth: 0,
}

const pillButton: React.CSSProperties = {
  minHeight: 26,
  padding: '1px 10px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid transparent',
}

const receiptSentStyle: React.CSSProperties = {
  ...pillButton,
  background: 'var(--success-bg)',
  color: 'var(--success)',
}

const receiptMissingStyle: React.CSSProperties = {
  ...pillButton,
  background: 'var(--warning-bg)',
  color: 'var(--warning)',
}

const testTagStyle: React.CSSProperties = {
  padding: '1px 8px',
  borderRadius: 10,
  background: 'var(--border)',
  color: 'var(--text-muted)',
  fontSize: 12,
}

const statusChoiceStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
}

const footerStyle: React.CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid var(--border)',
}

const nextButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 42,
  padding: '0 14px',
  border: '1px solid var(--accent)',
  borderRadius: 8,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

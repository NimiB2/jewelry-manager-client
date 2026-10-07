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
  // Called once an order was completed, so the screen can celebrate.
  onCompleted: (order: Order) => void
}

const NEEDS_RECEIPT = 'יש לשלוח קבלה לפני סיום ההזמנה'

// What one tap on the main button does: move the order to the next status.
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  NEW: { status: 'IN_PROGRESS', label: 'התחלת הכנה ←' },
  IN_PROGRESS: { status: 'READY', label: 'סימון כמוכנה ←' },
  READY: { status: 'COMPLETED', label: 'סיום ההזמנה ✓' },
}

// Kept as small as possible: customer and amount, one line of marks, and at most one action row.
// Notes and the list of items are shown but stay small; the items open with one tap.
export function OrderCard({ order, stages, onOpen, onChanged, onCompleted }: OrderCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choosingStatus, setChoosingStatus] = useState(false)
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [showItems, setShowItems] = useState(false)

  async function run<T>(action: () => Promise<T>): Promise<T | null> {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      onChanged()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
      return null
    } finally {
      setBusy(false)
    }
  }

  const setStatus = (status: OrderStatus) =>
    run(() => apiJson<Order>(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))

  // Completing locks the order, so it needs the receipt and a "sure?"; every other move is at once.
  function requestStatus(status: OrderStatus) {
    setChoosingStatus(false)
    if (status === order.status) return
    if (status === 'COMPLETED') {
      if (order.receiptSent) setConfirmingComplete(true)
      else setError(NEEDS_RECEIPT)
      return
    }
    void setStatus(status)
  }

  async function confirmComplete() {
    setConfirmingComplete(false)
    const done = await setStatus('COMPLETED')
    if (done) onCompleted(done)
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
  const completed = order.status === 'COMPLETED'
  const receiptBlocksEnd = order.status === 'READY' && !order.receiptSent
  const receiptLocked = order.isCompleted && order.receiptSent

  return (
    <article style={{ ...cardStyle, ...(completed ? completedCardStyle : null) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button type="button" onClick={onOpen} style={openButtonStyle} aria-label={`פתיחת הזמנה ${order.number}`}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {order.customer ?? 'ללא שם לקוחה'}
              {order.isTest && <span style={demoNoteStyle}> (הזמנת דמו)</span>}
            </span>
          </button>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>
              #{order.number} · {formatOrderDate(order.date)} ·
            </span>
            <button
              type="button"
              onClick={() => setShowItems((v) => !v)}
              aria-expanded={showItems}
              title={order.items.map((i) => `${i.name} × ${i.quantity}`).join('\n')}
              style={itemsButtonStyle}
            >
              {itemsCount} {itemsCount === 1 ? 'פריט' : 'פריטים'} {showItems ? '▴' : '▾'}
            </button>
            <SourceBadge source={order.source} />
          </div>
        </div>

        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(order.finalAmount)}</div>
          {order.hasDiscount && (
            <div style={mutedTextStyle}>
              <span style={{ textDecoration: 'line-through' }}>{formatMoney(order.amount)}</span> · הנחה {order.discountPercent}%
            </div>
          )}
        </div>
      </div>

      {showItems && (
        <ul style={itemsListStyle}>
          {order.items.map((item) => (
            <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>
                {item.name} <span style={{ color: 'var(--text-muted)' }}>· {item.material} × {item.quantity}</span>
                {item.note && (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                    <b style={{ fontWeight: 600 }}>הערה:</b> {item.note}
                  </span>
                )}
              </span>
              <span>{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      {order.notes && (
        <p style={notesStyle} title={order.notes}>
          <b style={{ fontWeight: 600 }}>הערה:</b> {order.notes}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setChoosingStatus((v) => !v)}
          disabled={busy}
          aria-expanded={choosingStatus}
          title="בחירת סטטוס אחר"
          style={{ ...statusPillStyle(order.status), border: '1px solid transparent', minHeight: 26, cursor: 'pointer' }}
        >
          {completed ? '✓ ' : ''}
          {STATUS_LABELS[order.status]} ▾
        </button>
        <button
          type="button"
          onClick={toggleReceipt}
          disabled={busy || receiptLocked}
          aria-pressed={order.receiptSent}
          title={
            receiptLocked
              ? 'הזמנה שהושלמה חייבת קבלה'
              : order.receiptSent
                ? 'הקבלה נשלחה. לחיצה מבטלת את הסימון'
                : 'לחיצה מסמנת שהקבלה נשלחה'
          }
          style={order.receiptSent ? receiptSentStyle : receiptMissingStyle}
        >
          {order.receiptSent ? '☑ קבלה נשלחה' : '☐ קבלה לא נשלחה'}
          {receiptBlocksEnd ? ' · חובה לסיום' : ''}
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
                  minHeight: 36,
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
        <div style={actionRowStyle}>
          <StageChips stages={stages} current={order.preparationStage} disabled={busy} compact onPick={pickStage} />
          <button type="button" onClick={advanceStage} disabled={busy} style={smallNextStyle}>
            הבא ←
          </button>
        </div>
      )}

      {next && !(order.status === 'IN_PROGRESS' && hasStages) && !confirmingComplete && (
        <div style={actionRowStyle}>
          <button
            type="button"
            onClick={() => requestStatus(next.status)}
            disabled={busy || (next.status === 'COMPLETED' && !order.receiptSent)}
            title={next.status === 'COMPLETED' && !order.receiptSent ? NEEDS_RECEIPT : undefined}
            style={{ ...nextButtonStyle, ...(next.status === 'COMPLETED' && !order.receiptSent ? disabledNextStyle : null) }}
          >
            {next.label}
          </button>
        </div>
      )}

      {error && (
        <p style={{ ...errorTextStyle, marginTop: 6, fontSize: 12 }}>{error}</p>
      )}
    </article>
  )
}

const completedCardStyle: React.CSSProperties = {
  borderInlineStart: '4px solid var(--success)',
}

const openButtonStyle: React.CSSProperties = {
  display: 'block',
  border: 'none',
  background: 'transparent',
  padding: 0,
  textAlign: 'right',
  cursor: 'pointer',
  maxWidth: '100%',
}

const itemsButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: 13,
  color: 'var(--accent)',
  cursor: 'pointer',
}

const itemsListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: '8px 0 0',
  padding: '6px 10px',
  borderRadius: 8,
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontSize: 13,
}

// Notes stay to two short lines so a long note can't blow up the card; the full text is in the order.
const notesStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 12,
  color: 'var(--text-muted)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
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

// A quiet warning: small red text on a faint tint, with a dashed edge that says "tap me".
const receiptMissingStyle: React.CSSProperties = {
  ...pillButton,
  fontWeight: 500,
  background: 'var(--danger-bg)',
  color: 'var(--danger)',
  border: '1px dashed var(--danger)',
}

// Small and gray on purpose: a note, not a label.
const demoNoteStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  color: 'var(--text-muted)',
}

const statusChoiceStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
}

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
}

const disabledNextStyle: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
}

const nextButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 36,
  padding: '0 14px',
  border: '1px solid var(--accent)',
  borderRadius: 8,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const smallNextStyle: React.CSSProperties = {
  ...nextButtonStyle,
  width: 'auto',
  flexShrink: 0,
  minHeight: 32,
  padding: '0 12px',
  fontSize: 13,
}

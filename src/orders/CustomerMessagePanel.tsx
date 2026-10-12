import { useState } from 'react'
import { apiJson } from '../api'
import { errorTextStyle, mutedTextStyle, secondaryButtonStyle } from '../products/productStyles'
import { notifyOrdersChanged } from './attention'
import type { Order } from './types'

type PillProps = {
  order: Order
  open: boolean
  onClick: () => void
}

// The same kind of mark as "receipt sent": green once the order summary went to the customer, a red dashed
// reminder while it did not. Tapping it opens the message, ready to send.
export function WhatsAppPill({ order, open, onClick }: PillProps) {
  if (!order.customerMessage) return null

  const sent = !!order.customerNotifiedAt

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      title={sent ? 'ההודעה נשלחה ללקוחה. לחיצה פותחת אותה' : 'ההודעה עוד לא נשלחה. לחיצה פותחת אותה לשליחה'}
      style={sent ? sentStyle : notSentStyle}
    >
      {sent ? '☑ וואטסאפ נשלח' : '☐ וואטסאפ לא נשלח · לשליחה'}
    </button>
  )
}

type BodyProps = {
  order: Order
  // Called after the "sent" mark changed, so the list can reload.
  onChanged: () => void
}

// The order summary she sends the customer right after she orders. The text is ready (the real details
// are filled in); she opens it in WhatsApp with one tap, already addressed to the customer's number,
// and only has to press send. The number is kept only until it is marked sent, then it is erased.
export function CustomerMessageBody({ order, onChanged }: BodyProps) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'message' | 'phone' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!order.customerMessage) return null

  const sent = !!order.customerNotifiedAt
  const link = order.customerWhatsApp
    ? `https://wa.me/${order.customerWhatsApp}?text=${encodeURIComponent(order.customerMessage)}`
    : null

  async function copy(kind: 'message' | 'phone', text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setError('ההעתקה נכשלה. אפשר לסמן את הטקסט ולהעתיק ידנית')
    }
  }

  async function markSent(value: boolean) {
    setBusy(true)
    setError(null)
    try {
      await apiJson<Order>(`/orders/${order.id}/customer-notified`, {
        method: 'PATCH',
        body: JSON.stringify({ notified: value }),
      })
      notifyOrdersChanged()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={panelStyle}>
      <pre dir="rtl" style={messageStyle}>
        {order.customerMessage}
      </pre>

      <div style={{ ...mutedTextStyle, margin: '8px 0' }}>
        {order.customerPhone ? (
          <>
            מספר הלקוחה:{' '}
            <b dir="ltr" style={{ color: 'var(--text)' }}>
              {order.customerPhone}
            </b>
          </>
        ) : sent ? (
          'המספר נמחק מהמערכת אחרי השליחה.'
        ) : (
          'אין מספר טלפון בהזמנה'
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {link && !sent && (
          <a href={link} target="_blank" rel="noreferrer" style={whatsappStyle}>
            פתיחה בוואטסאפ ללקוחה
          </a>
        )}
        <button
          type="button"
          style={{ ...secondaryButtonStyle, minHeight: 40 }}
          onClick={() => void copy('message', order.customerMessage ?? '')}
        >
          {copied === 'message' ? 'הועתק ✓' : 'העתקת ההודעה'}
        </button>
        {order.customerPhone && (
          <button
            type="button"
            style={{ ...secondaryButtonStyle, minHeight: 40 }}
            onClick={() => void copy('phone', order.customerPhone ?? '')}
          >
            {copied === 'phone' ? 'הועתק ✓' : 'העתקת המספר'}
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void markSent(!sent)}
        style={{ ...secondaryButtonStyle, minHeight: 40, width: '100%', marginTop: 8 }}
      >
        {sent ? 'ביטול הסימון "נשלח"' : 'סימון: ההודעה נשלחה ללקוחה (המספר יימחק)'}
      </button>

      {error && <p style={{ ...errorTextStyle, marginTop: 6, fontSize: 12 }}>{error}</p>}
    </div>
  )
}

// Pill and message together, for the cards that have no status row of their own (the waiting orders).
export function CustomerMessagePanel({ order, onChanged }: BodyProps) {
  const [open, setOpen] = useState(false)
  if (!order.customerMessage) return null

  return (
    <div style={{ marginTop: 10 }}>
      <WhatsAppPill order={order} open={open} onClick={() => setOpen((v) => !v)} />
      {open && <CustomerMessageBody order={order} onChanged={onChanged} />}
    </div>
  )
}

const pillBase: React.CSSProperties = {
  minHeight: 26,
  padding: '1px 10px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid transparent',
}

const sentStyle: React.CSSProperties = {
  ...pillBase,
  background: 'var(--success-bg)',
  color: 'var(--success)',
}

const notSentStyle: React.CSSProperties = {
  ...pillBase,
  fontWeight: 500,
  background: 'var(--danger-bg)',
  color: 'var(--danger)',
  border: '1px dashed var(--danger)',
}

const panelStyle: React.CSSProperties = {
  marginTop: 6,
  padding: 10,
  borderRadius: 8,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
}

const messageStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  font: 'inherit',
  fontSize: 14,
  lineHeight: 1.5,
  textAlign: 'right',
}

const whatsappStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 40,
  padding: '0 14px',
  borderRadius: 10,
  background: '#25d366',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  textDecoration: 'none',
}

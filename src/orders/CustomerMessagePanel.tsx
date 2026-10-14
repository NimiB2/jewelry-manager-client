import { useState } from 'react'
import { apiJson } from '../api'
import { errorTextStyle, mutedTextStyle, secondaryButtonStyle } from '../products/productStyles'
import { notifyOrdersChanged } from './attention'
import { ChatIcon } from './pillIcons'
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
      <ChatIcon />
      {sent ? 'וואטסאפ נשלח ✓' : 'וואטסאפ לא נשלח · לשליחה'}
    </button>
  )
}

type BodyProps = {
  order: Order
  // Called after the "sent" mark changed, so the list can reload.
  onChanged: () => void
  // Called once the mark was saved, so the card can fold the message away again.
  onDone?: () => void
}

// The order summary she sends the customer right after she orders. The text is ready (the real details
// are filled in); she opens it in WhatsApp with one tap, already addressed to the customer's number,
// and only has to press send. The number is kept only until it is marked sent, then it is erased.
export function CustomerMessageBody({ order, onChanged, onDone }: BodyProps) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'message' | 'phone' | null>(null)
  const [error, setError] = useState<string | null>(null)
  // She can adjust the text before sending; the change lives only here, until the panel is closed.
  const [edited, setEdited] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  if (!order.customerMessage) return null

  const message = edited ?? order.customerMessage

  const sent = !!order.customerNotifiedAt
  const link = order.customerWhatsApp
    ? `https://wa.me/${order.customerWhatsApp}?text=${encodeURIComponent(message)}`
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
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={panelStyle}>
      {editing ? (
        <textarea
          dir="rtl"
          value={message}
          onChange={(e) => setEdited(e.target.value)}
          aria-label="עריכת ההודעה"
          rows={Math.min(14, Math.max(5, message.split('\n').length + 1))}
          style={{ ...messageStyle, width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
        />
      ) : (
        <pre dir="rtl" style={messageStyle}>
          {message}
        </pre>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '6px 0 0' }}>
        <button type="button" style={{ ...secondaryButtonStyle, minHeight: 36 }} onClick={() => setEditing((v) => !v)}>
          {editing ? 'סיום עריכה' : '✎ עריכת ההודעה'}
        </button>
        {edited !== null && (
          <button
            type="button"
            style={{ ...secondaryButtonStyle, minHeight: 36 }}
            onClick={() => {
              setEdited(null)
              setEditing(false)
            }}
          >
            שחזור למקור
          </button>
        )}
      </div>

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
          onClick={() => void copy('message', message)}
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
      {open && <CustomerMessageBody order={order} onChanged={onChanged} onDone={() => setOpen(false)} />}
    </div>
  )
}

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  minHeight: 30,
  padding: '0 6px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
}

// WhatsApp's own green once it went out; amber (not red, which belongs to the receipt) while it did not.
const sentStyle: React.CSSProperties = {
  ...pillBase,
  color: '#0b7a3c',
}

const notSentStyle: React.CSSProperties = {
  ...pillBase,
  color: 'var(--warning)',
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

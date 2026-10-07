import { useEffect, useState } from 'react'
import { apiJson } from '../api'
import { chipStyle, selectStyle } from '../finances/styles'
import { ConfirmInline } from '../orders/ConfirmInline'
import { formatOrderDate } from '../orders/dates'
import type { OrdersList } from '../orders/types'
import {
  cardStyle,
  errorTextStyle,
  fieldInputStyle,
  fieldLabelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../products/productStyles'
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, type Task, type TaskStatus } from './types'

type TaskFormProps = {
  // Null = a new task.
  task: Task | null
  onSaved: () => void
  onCancel: () => void
}

type OrderOption = { id: string; label: string }

export function TaskForm({ task, onSaved, onCancel }: TaskFormProps) {
  const editing = task !== null
  const [title, setTitle] = useState(task?.title ?? '')
  const [content, setContent] = useState(task?.content ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'NEW')
  const [orderId, setOrderId] = useState(task?.orderId ?? '')
  const [orders, setOrders] = useState<OrderOption[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Every order can be picked, newest first; the link is optional.
  useEffect(() => {
    apiJson<OrdersList>('/orders?status=all')
      .then((list) =>
        setOrders(
          list.orders.map((o) => ({
            id: o.id,
            label: `#${o.number} · ${o.customer ?? 'ללא שם'} · ${formatOrderDate(o.date)}`,
          })),
        ),
      )
      .catch(() => setOrders([]))
  }, [])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
      setBusy(false)
    }
  }

  function save() {
    if (!title.trim()) return setError('צריך להוסיף כותרת')
    const body = JSON.stringify({ title: title.trim(), content: content.trim() || null, status, orderId: orderId || null })
    void run(() => apiJson(editing ? `/tasks/${task.id}` : '/tasks', { method: editing ? 'PUT' : 'POST', body }))
  }

  // A linked order that is not in the list (e.g. a long-gone one) still shows, so the link is not lost on save.
  const knownOrder = orderId === '' || orders.some((o) => o.id === orderId)

  return (
    <div style={{ ...cardStyle, marginBottom: 12 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{editing ? 'עריכת משימה' : 'משימה חדשה'}</h2>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={fieldLabelStyle}>כותרת</span>
        <input
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="למשל: להזמין אבנים, לצלם מוצרים"
          style={fieldInputStyle}
          autoFocus
        />
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={fieldLabelStyle}>תוכן (לא חובה)</span>
        <textarea
          value={content}
          maxLength={4000}
          rows={3}
          onChange={(e) => setContent(e.target.value)}
          style={{ ...fieldInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </label>

      <div style={{ marginBottom: 8 }}>
        <span style={fieldLabelStyle}>סטטוס</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {TASK_STATUS_ORDER.map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} style={chipStyle(status === s)}>
              {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={fieldLabelStyle}>קשורה להזמנה (לא חובה)</span>
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)} style={{ ...selectStyle, minHeight: 44 }}>
          <option value="">ללא הזמנה</option>
          {!knownOrder && task && <option value={orderId}>#{task.orderNumber} · {task.orderCustomer ?? 'ללא שם'}</option>}
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p style={{ ...errorTextStyle, margin: '8px 0' }}>{error}</p>}

      {confirmingDelete && (
        <ConfirmInline
          message="למחוק את המשימה?"
          confirmLabel="כן, למחוק"
          busy={busy}
          onConfirm={() => void run(() => apiJson(`/tasks/${task!.id}`, { method: 'DELETE' }))}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={save} disabled={busy} style={{ ...primaryButtonStyle, flex: 1 }}>
          {busy ? 'שומר...' : 'שמירה'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={secondaryButtonStyle}>
          ביטול
        </button>
        {editing && !confirmingDelete && (
          <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy} style={{ ...secondaryButtonStyle, color: 'var(--danger)' }}>
            מחיקה
          </button>
        )}
      </div>
    </div>
  )
}

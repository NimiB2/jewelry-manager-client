import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { chipStyle } from '../finances/styles'
import { PlusIcon } from '../icons/NavIcons'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { Toast } from '../orders/Toast'
import { Modal } from '../shell/Modal'
import { ConfirmInline } from '../orders/ConfirmInline'
import { STATUS_LABELS, statusPillStyle } from '../orders/status'
import type { OrderStatus } from '../orders/types'
import { navigate } from '../shell/useRoute'
import { TaskForm } from './TaskForm'
import {
  NEXT_TASK_STATUS,
  TASK_STATUS_LABELS,
  taskPillStyle,
  type Task,
  type TaskStatus,
} from './types'

type Filter = 'open' | 'all' | TaskStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'פתוחות' },
  { value: 'COMPLETED', label: 'הושלמו' },
  { value: 'all', label: 'הכל' },
]

type FormState = { open: false } | { open: true; task: Task | null }

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [form, setForm] = useState<FormState>({ open: false })
  const [toast, setToast] = useState<string[] | null>(null)
  const requestCounter = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestCounter.current
    // "Open" is two statuses, so the server returns everything and the screen narrows it.
    const query = filter === 'COMPLETED' ? '?status=COMPLETED' : ''
    apiJson<Task[]>(`/tasks${query}`)
      .then((list) => {
        if (requestId !== requestCounter.current) return
        setTasks(list)
        setError(null)
      })
      .catch((err) => {
        if (requestId === requestCounter.current) setError(err instanceof Error ? err.message : String(err))
      })
  }, [filter])

  useEffect(load, [load])

  function openForm(task: Task | null) {
    setForm({ open: true, task })
  }

  const visible = tasks?.filter((t) => filter !== 'open' || t.status !== 'COMPLETED') ?? []

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>משימות</h1>
        <button type="button" onClick={() => openForm(null)} style={{ ...primaryButtonStyle, minHeight: 40 }}>
          + משימה חדשה
        </button>
      </div>

      {form.open && (
        <Modal title={form.task ? 'עריכת משימה' : 'משימה חדשה'} onClose={() => setForm({ open: false })}>
          <TaskForm
            key={form.task?.id ?? 'new'}
            task={form.task}
            onSaved={(message) => {
              setForm({ open: false })
              setToast(message)
              load()
            }}
            onCancel={() => setForm({ open: false })}
          />
        </Modal>
      )}

      {toast && <Toast lines={toast} onDone={() => setToast(null)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)} style={chipStyle(filter === f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p style={errorTextStyle}>שגיאה בטעינת המשימות: {error}</p>}
      {!tasks && !error && <p style={mutedTextStyle}>טוען משימות...</p>}

      {tasks && visible.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
            {filter === 'open' ? 'אין משימות פתוחות' : 'אין משימות להצגה'}
          </p>
          <p style={{ ...mutedTextStyle, marginBottom: 14 }}>משימה יכולה להיות קשורה להזמנה, או סתם דבר שצריך לזכור.</p>
          <button type="button" onClick={() => openForm(null)} style={primaryButtonStyle}>
            משימה חדשה
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 90 }}>
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              // A task made from an order is the order itself: tapping it opens the order, not a task form.
              onOpen={() => (task.isAutomatic && task.orderId ? navigate(`/orders/${task.orderId}`) : openForm(task))}
              onChanged={load}
            />
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => openForm(null)} aria-label="משימה חדשה">
        <PlusIcon />
      </button>
    </div>
  )
}

// The next step of an order, as on the order card.
const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  NEW: { status: 'IN_PROGRESS', label: 'התחלת הכנה ←' },
  IN_PROGRESS: { status: 'READY', label: 'סימון כמוכנה ←' },
  READY: { status: 'COMPLETED', label: 'סיום ההזמנה ✓' },
}

function TaskCard({ task, onOpen, onChanged }: { task: Task; onOpen: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const fromOrder = task.isAutomatic && task.orderId !== null
  const done = task.status === 'COMPLETED'

  // An order task has the order's status, and its button moves the order itself, so the two never differ.
  const orderStatus = task.orderStatus ?? 'NEW'
  const next = fromOrder ? NEXT_ORDER_STATUS[orderStatus] : NEXT_TASK_STATUS[task.status]

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

  const setTaskStatus = (status: TaskStatus) =>
    run(() => apiJson(`/tasks/${task.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))
  const setOrderStatus = (status: OrderStatus) =>
    run(() => apiJson(`/orders/${task.orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))

  function advance() {
    if (!next) return
    if (!fromOrder) return void setTaskStatus(next.status as TaskStatus)
    // Completing locks the order, so it asks first.
    if (next.status === 'COMPLETED') setConfirmingComplete(true)
    else void setOrderStatus(next.status as OrderStatus)
  }

  return (
    <article
      style={{
        ...cardStyle,
        ...(fromOrder ? { borderInlineStart: '4px solid var(--accent)' } : done ? { borderInlineStart: '4px solid var(--success)' } : null),
      }}
    >
      <button type="button" onClick={onOpen} style={openStyle} aria-label={fromOrder ? `פתיחת ${task.title}` : `עריכת המשימה ${task.title}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: done ? 'var(--text-muted)' : 'var(--text)',
              textDecoration: done ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>
          {fromOrder ? (
            <span style={{ ...statusPillStyle(orderStatus), flexShrink: 0 }}>{STATUS_LABELS[orderStatus]}</span>
          ) : (
            <span style={{ ...taskPillStyle(task.status), flexShrink: 0 }}>{TASK_STATUS_LABELS[task.status]}</span>
          )}
        </div>
        {task.content && <p style={contentStyle}>{task.content}</p>}
      </button>

      {fromOrder ? (
        <button type="button" onClick={onOpen} style={orderLinkStyle}>
          נוצרה מהזמנה #{task.orderNumber} · עריכה בהזמנה ←
        </button>
      ) : (
        task.orderId && (
          <button type="button" onClick={() => navigate(`/orders/${task.orderId}`)} style={orderLinkStyle}>
            הזמנה #{task.orderNumber} · {task.orderCustomer ?? 'ללא שם'} ←
          </button>
        )
      )}

      {confirmingComplete && (
        <ConfirmInline
          message="לסמן את ההזמנה כהושלמה? היא תינעל לעריכה."
          confirmLabel="כן, להשלים"
          busy={busy}
          onConfirm={() => {
            setConfirmingComplete(false)
            void setOrderStatus('COMPLETED')
          }}
          onCancel={() => setConfirmingComplete(false)}
        />
      )}

      {next && !confirmingComplete && (
        <button type="button" onClick={advance} disabled={busy} style={nextButtonStyle}>
          {next.label}
        </button>
      )}

      {done && !fromOrder && (
        <button type="button" onClick={() => void setTaskStatus('NEW')} disabled={busy} style={reopenStyle}>
          פתיחה מחדש
        </button>
      )}

      {error && <p style={{ ...errorTextStyle, marginTop: 6, fontSize: 12 }}>{error}</p>}
    </article>
  )
}

const openStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: 0,
  textAlign: 'right',
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
}

// Two short lines at most, so a long note can't blow up the card; the full text is in the edit form.
const contentStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 13,
  color: 'var(--text-muted)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'pre-line',
}

const orderLinkStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: '6px 0 0',
  fontSize: 13,
  color: 'var(--accent)',
  cursor: 'pointer',
}

const nextButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 36,
  marginTop: 8,
  padding: '0 14px',
  border: '1px solid var(--accent)',
  borderRadius: 8,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const reopenStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: '6px 0 0',
  fontSize: 13,
  color: 'var(--text-muted)',
  cursor: 'pointer',
}

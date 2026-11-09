import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { PlusIcon } from '../icons/NavIcons'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { Toast } from '../orders/Toast'
import { Modal } from '../shell/Modal'
import { ConfirmInline } from '../orders/ConfirmInline'
import { STATUS_LABELS } from '../orders/status'
import type { OrderStatus } from '../orders/types'
import { FilterTabs } from '../shell/FilterTabs'
import { SkeletonCards } from '../shell/Skeleton'
import { navigate } from '../shell/useRoute'
import { TaskForm } from './TaskForm'
import { NEXT_TASK_STATUS, TASK_STATUS_LABELS, type Task, type TaskStatus } from './types'

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

      <FilterTabs items={FILTERS} value={filter} onChange={setFilter} ariaLabel="סטטוס משימות" style={{ marginBottom: 12 }} />

      {error && <p style={errorTextStyle}>שגיאה בטעינת המשימות: {error}</p>}
      {!tasks && !error && <SkeletonCards label="טוען משימות" />}

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
        // Columns wrap to the next line instead of scrolling sideways.
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'start', paddingBottom: 90 }}>
          {groupTasks(visible).map((group) => (
            <TaskColumn key={group.key} title={group.title} color={group.color} count={group.tasks.length}>
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  // A task made from an order is the order itself: tapping it opens the order, not a task form.
                  onOpen={() => (task.isAutomatic && task.orderId ? navigate(`/orders/${task.orderId}`) : openForm(task))}
                  onChanged={load}
                />
              ))}
            </TaskColumn>
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => openForm(null)} aria-label="משימה חדשה">
        <PlusIcon />
      </button>
    </div>
  )
}

type TaskGroup = { key: string; title: string; color: string; tasks: Task[] }

// Muted tones, kept away from the order purple so every category stays distinguishable from orders.
const CATEGORY_COLORS = ['#3b6e8f', '#4d7c5a', '#a0643a', '#9a4f4f', '#3d7a7a']
const ORDER_TASK_COLOR = '#6b5b95'

// Order tasks get their own column; general tasks are grouped by category, with uncategorized ones last.
function groupTasks(list: Task[]): TaskGroup[] {
  const orderTasks = list.filter((t) => t.isAutomatic && t.orderId !== null)
  const generalTasks = list.filter((t) => !(t.isAutomatic && t.orderId !== null))

  const byCategory = new Map<string, Task[]>()
  for (const task of generalTasks) {
    const category = task.category ?? ''
    byCategory.set(category, [...(byCategory.get(category) ?? []), task])
  }
  const categories = [...byCategory.keys()].sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return a.localeCompare(b, 'he')
  })

  const groups: TaskGroup[] = []
  if (orderTasks.length > 0) groups.push({ key: 'orders', title: 'הזמנות', color: ORDER_TASK_COLOR, tasks: orderTasks })
  categories.forEach((category, index) => {
    groups.push({
      key: `category-${category}`,
      title: category || 'ללא קטגוריה',
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      tasks: byCategory.get(category) ?? [],
    })
  })
  return groups
}

function TaskColumn({ title, color, count, children }: { title: string; color: string; count: number; children: React.ReactNode }) {
  return (
    <section style={{ minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, padding: '8px 10px', borderTop: `3px solid ${color}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflowWrap: 'anywhere' }}>{title}</span>
        <span style={mutedTextStyle}>{count}</span>
      </header>
      {children}
    </section>
  )
}

// The next step of an order, as on the order card.
const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  NEW: { status: 'IN_PROGRESS', label: 'התחלת הכנה' },
  IN_PROGRESS: { status: 'READY', label: 'סימון כמוכנה' },
  READY: { status: 'COMPLETED', label: 'סיום ההזמנה' },
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

  const statusText = fromOrder ? STATUS_LABELS[orderStatus] : TASK_STATUS_LABELS[task.status]

  return (
    <article style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
      <button type="button" onClick={onOpen} style={openStyle} aria-label={fromOrder ? `פתיחת ${task.title}` : `עריכת המשימה ${task.title}`}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: done ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: done ? 'line-through' : 'none',
            overflowWrap: 'anywhere',
          }}
        >
          {task.title}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{statusText}</span>
        {task.content && !fromOrder && <p style={contentStyle}>{task.content}</p>}
      </button>

      {!fromOrder && task.orderId && (
        <button type="button" onClick={() => navigate(`/orders/${task.orderId}`)} style={orderLinkStyle}>
          הזמנה #{task.orderNumber} · {task.orderCustomer ?? 'ללא שם'} ←
        </button>
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

// One line only; the full text is in the edit form.
const contentStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 12,
  color: 'var(--text-muted)',
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'pre-line',
}

const orderLinkStyle: React.CSSProperties = {
  display: 'block',
  border: 'none',
  background: 'transparent',
  padding: '4px 0 0',
  fontSize: 11,
  color: 'var(--text-muted)',
  cursor: 'pointer',
}

const nextButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 28,
  marginTop: 6,
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 12,
  cursor: 'pointer',
}

const reopenStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: '6px 0 0',
  fontSize: 12,
  color: 'var(--text-muted)',
  cursor: 'pointer',
}

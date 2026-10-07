import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { chipStyle } from '../finances/styles'
import { PlusIcon } from '../icons/NavIcons'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        <TaskForm
          key={form.task?.id ?? 'new'}
          task={form.task}
          onSaved={() => {
            setForm({ open: false })
            load()
          }}
          onCancel={() => setForm({ open: false })}
        />
      )}

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
            <TaskCard key={task.id} task={task} onOpen={() => openForm(task)} onChanged={load} />
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => openForm(null)} aria-label="משימה חדשה">
        <PlusIcon />
      </button>
    </div>
  )
}

function TaskCard({ task, onOpen, onChanged }: { task: Task; onOpen: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = NEXT_TASK_STATUS[task.status]
  const done = task.status === 'COMPLETED'

  async function setStatus(status: TaskStatus) {
    setBusy(true)
    setError(null)
    try {
      await apiJson(`/tasks/${task.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article style={{ ...cardStyle, ...(done ? { borderInlineStart: '4px solid var(--success)' } : null) }}>
      <button type="button" onClick={onOpen} style={openStyle} aria-label={`עריכת המשימה ${task.title}`}>
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
          <span style={{ ...taskPillStyle(task.status), flexShrink: 0 }}>{TASK_STATUS_LABELS[task.status]}</span>
        </div>
        {task.content && <p style={contentStyle}>{task.content}</p>}
      </button>

      {task.orderId && (
        <button type="button" onClick={() => navigate(`/orders/${task.orderId}`)} style={orderLinkStyle}>
          הזמנה #{task.orderNumber} · {task.orderCustomer ?? 'ללא שם'} ←
        </button>
      )}

      {next && (
        <button type="button" onClick={() => void setStatus(next.status)} disabled={busy} style={nextButtonStyle}>
          {next.label}
        </button>
      )}

      {done && (
        <button type="button" onClick={() => void setStatus('NEW')} disabled={busy} style={reopenStyle}>
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

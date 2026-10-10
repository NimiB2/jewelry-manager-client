import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { PlusIcon, SearchIcon } from '../icons/NavIcons'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { navigate } from '../shell/useRoute'
import { monthName, periodRange } from './dates'
import { completionMessage } from './celebrate'
import { OrderCard } from './OrderCard'
import { PendingOrders } from './PendingOrders'
import { Toast } from './Toast'
import type { OrdersList } from './types'

type StatusFilter = 'active' | 'completed' | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'פעילות' },
  { value: 'completed', label: 'הושלמו' },
  { value: 'all', label: 'הכל' },
]

export function OrdersPage() {
  const [data, setData] = useState<OrdersList | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [celebration, setCelebration] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<StatusFilter>('active')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)

  // Only the newest request may update the screen, so a slow older one can't overwrite it.
  const requestCounter = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestCounter.current
    const params = new URLSearchParams({ status })
    if (search.trim()) params.set('search', search.trim())
    const range = periodRange(year, month)
    if (range) {
      params.set('from', range.from)
      params.set('to', range.to)
    }

    apiJson<OrdersList>(`/orders?${params}`)
      .then((list) => {
        if (requestId !== requestCounter.current) return
        setData(list)
        setError(null)
      })
      .catch((err) => {
        if (requestId === requestCounter.current) setError(err instanceof Error ? err.message : String(err))
      })
  }, [status, search, year, month])

  // Typing in the search box waits a moment so each letter doesn't hit the server.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  useEffect(() => {
    apiJson<number[]>('/orders/years').then(setYears).catch(() => setYears([]))
    apiJson<{ data: { preparationStages?: string[] } }>('/settings')
      .then((s) => setStages(s.data.preparationStages ?? []))
      .catch(() => setStages([]))

    // She may have changed things elsewhere (another tab, another device): refresh on return.
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  function pickYear(value: string) {
    setYear(value === '' ? null : Number(value))
    if (value === '') setMonth(null)
  }

  function pickMonth(value: string) {
    if (value === '') {
      setMonth(null)
      return
    }
    // A month needs a year; default to the current one.
    if (year === null) setYear(new Date().getFullYear())
    setMonth(Number(value))
  }

  function showThisMonth() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  const yearOptions = [...new Set([...years, ...(year !== null ? [year] : [new Date().getFullYear()])])].sort((a, b) => b - a)
  const filtered = year !== null || search.trim() !== '' || status !== 'active'

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>הזמנות</h1>
        <button type="button" onClick={() => navigate('/orders/new')} style={{ ...primaryButtonStyle, minHeight: 40 }}>
          + הזמנה חדשה
        </button>
      </div>

      <PendingOrders onChanged={load} />

      <div style={{ position: 'relative', marginBottom: 8 }}>
        <span style={searchIconStyle}>
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="שם לקוחה או מספר הזמנה"
          aria-label="חיפוש הזמנה"
          style={{ ...fieldInputStyle, minHeight: 50, paddingInlineStart: 40, fontSize: 17 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            aria-pressed={status === f.value}
            style={chipStyle(status === f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
          <select value={year ?? ''} onChange={(e) => pickYear(e.target.value)} aria-label="שנה" style={selectStyle}>
            <option value="">כל השנים</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={month ?? ''} onChange={(e) => pickMonth(e.target.value)} aria-label="חודש" style={selectStyle}>
            <option value="">כל החודשים</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
          <button type="button" onClick={showThisMonth} style={thisMonthStyle}>
            החודש
          </button>
        </div>
        {data && (
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            {data.summary.count} {data.summary.count === 1 ? 'הזמנה' : 'הזמנות'} · סה"כ{' '}
            <b style={{ color: 'var(--text)' }}>{formatMoney(data.summary.totalFinalAmount)}</b>
          </p>
        )}
      </div>

      {error && <p style={errorTextStyle}>שגיאה בטעינת ההזמנות: {error}</p>}
      {!data && !error && <p style={mutedTextStyle}>טוען הזמנות...</p>}

      {data && data.orders.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
            {filtered ? 'לא נמצאו הזמנות' : 'עוד אין הזמנות'}
          </p>
          <p style={{ ...mutedTextStyle, marginBottom: filtered ? 0 : 14 }}>
            {filtered ? 'נסי לשנות את החיפוש, הסטטוס או התקופה.' : 'הזמנה נוצרת מהמוצרים שבקטלוג.'}
          </p>
          {!filtered && (
            <button type="button" onClick={() => navigate('/orders/new')} style={primaryButtonStyle}>
              הזמנה חדשה
            </button>
          )}
        </div>
      )}

      {data && data.orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 90 }}>
          {data.orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              stages={stages}
              onOpen={() => navigate(`/orders/${order.id}`)}
              onChanged={load}
              onCompleted={async (done) => setCelebration(await completionMessage(done))}
            />
          ))}
        </div>
      )}

      {celebration && <Toast lines={celebration} onDone={() => setCelebration(null)} />}

      <button type="button" className="fab" onClick={() => navigate('/orders/new')} aria-label="הזמנה חדשה">
        <PlusIcon />
      </button>
    </div>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: 36,
    minWidth: 64,
    padding: '0 14px',
    borderRadius: 18,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: 15,
    cursor: 'pointer',
  }
}

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  insetInlineStart: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  display: 'flex',
  pointerEvents: 'none',
}

const selectStyle: React.CSSProperties = {
  ...fieldInputStyle,
  minHeight: 40,
  padding: '4px 8px',
  fontSize: 14,
}

const thisMonthStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 14px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

import { useEffect, useState } from 'react'
import { apiJson } from '../api'
import { downloadFile } from '../finances/invoiceApi'
import type { FinanceList } from '../finances/types'
import { useOrdersAttention } from '../orders/attention'
import { SearchButton } from '../search/SearchButton'
import { Skeleton } from '../shell/Skeleton'
import { monthName, periodRange } from '../orders/dates'
import type { OrdersList } from '../orders/types'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import { ENGAGEMENT_RINGS } from '../shell/navItems'
import { navigate } from '../shell/useRoute'
import type { Task } from '../tasks/types'

type HomeData = {
  income: number | null
  expenses: number | null
  netProfit: number | null
  salary: number | null
  workHours: number | null
  inProgress: number | null
  ready: number | null
  notStarted: number | null
  openTasks: number | null
}

type HomePageProps = {
  userEmail: string | null
  onSignOut: () => void
}

// The landing screen. It is meant to be read in two seconds: what needs her, how the month is going,
// and the three things she reaches for most. Everything else lives one tap away.
export function HomePage({ userEmail, onSignOut }: HomePageProps) {
  const [data, setData] = useState<HomeData | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const attention = useOrdersAttention('home')
  const now = new Date()

  useEffect(() => {
    const range = periodRange(now.getFullYear(), now.getMonth() + 1)
    const params = new URLSearchParams({ from: range!.from, to: range!.to })

    // Each number loads on its own, so one failing call doesn't blank the whole screen.
    Promise.allSettled([
      apiJson<FinanceList>(`/finances?${params}`),
      apiJson<OrdersList>('/orders?status=active'),
      apiJson<Task[]>('/tasks'),
      apiJson<{ totals: { salary: number; workHours: number } }>(
        `/finances/analysis?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      ),
    ]).then(([finances, orders, tasks, analysis]) => {
      const list = orders.status === 'fulfilled' ? orders.value.orders : null
      setData({
        income: finances.status === 'fulfilled' ? finances.value.summary.totalIncome : null,
        expenses: finances.status === 'fulfilled' ? finances.value.summary.totalExpenses : null,
        netProfit: finances.status === 'fulfilled' ? finances.value.summary.netProfit : null,
        salary: analysis.status === 'fulfilled' ? analysis.value.totals.salary : null,
        workHours: analysis.status === 'fulfilled' ? analysis.value.totals.workHours : null,
        notStarted: list ? list.filter((o) => o.status === 'NEW').length : null,
        inProgress: list ? list.filter((o) => o.status === 'IN_PROGRESS').length : null,
        ready: list ? list.filter((o) => o.status === 'READY').length : null,
        openTasks: tasks.status === 'fulfilled' ? tasks.value.filter((t) => t.status !== 'COMPLETED').length : null,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCount = data && data.notStarted !== null ? data.notStarted + (data.inProgress ?? 0) + (data.ready ?? 0) : null
  const needs: string[] = []
  if (attention) {
    if (attention.pending > 0) needs.push(attention.pending === 1 ? 'הזמנה אחת לאישור' : `${attention.pending} הזמנות לאישור`)
    if (attention.messagesToSend > 0) {
      needs.push(attention.messagesToSend === 1 ? 'הודעה אחת ללקוחה לשליחה' : `${attention.messagesToSend} הודעות ללקוחות לשליחה`)
    }
    if (attention.alerts > 0) needs.push(attention.alerts === 1 ? 'הזמנה אחת ששונתה בחנות' : `${attention.alerts} הזמנות ששונו בחנות`)
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: '0 0 2px' }}>שלום</h1>
        <SearchButton />
      </div>
      <p style={{ ...mutedTextStyle, fontSize: 14, margin: '0 0 16px' }}>
        {monthName(now.getMonth() + 1)} {now.getFullYear()}
      </p>

      {needs.length > 0 && (
        <button type="button" onClick={() => navigate('/orders')} style={needsStyle}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>יש מה לעשות</span>
          <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', fontSize: 14 }}>
            {needs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </button>
      )}

      <button type="button" onClick={() => navigate('/finances')} style={{ ...cardStyle, ...monthCardStyle }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>רווח נקי החודש</span>
        <span
          dir="ltr"
          style={{
            fontSize: 32,
            fontWeight: 700,
            textAlign: 'right',
            color: data?.netProfit != null && data.netProfit < 0 ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {data?.netProfit == null ? <Skeleton width={120} height={34} /> : formatMoney(data.netProfit)}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {data?.income == null || data?.expenses == null ? (
            <Skeleton width={200} height={13} style={{ marginTop: 4 }} />
          ) : (
            `הכנסות ${formatMoney(data.income)} · הוצאות ${formatMoney(data.expenses)}`
          )}
        </span>
      </button>

      <button type="button" onClick={() => navigate('/finances/analysis')} style={{ ...cardStyle, ...tileStyle, width: '100%', marginTop: 10 }}>
        <span style={tileLabelStyle}>משכורת החודש</span>
        <span style={tileValueStyle}>{data?.salary == null ? <Skeleton width={90} height={26} /> : formatMoney(data.salary)}</span>
        {data?.workHours != null && data?.netProfit != null && data?.salary != null && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {Math.round(data.workHours * 10) / 10} שעות · רווח אחרי משכורת {formatMoney(data.netProfit - data.salary)}
          </span>
        )}
      </button>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button type="button" onClick={() => navigate('/orders')} style={{ ...cardStyle, ...tileStyle }}>
          <span style={tileLabelStyle}>הזמנות פעילות</span>
          <span style={tileValueStyle}>{activeCount === null ? <Skeleton width={36} height={26} /> : activeCount}</span>
          {data && data.notStarted !== null && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {data.inProgress} בהכנה · {data.ready} מוכנות
            </span>
          )}
        </button>
        <button type="button" onClick={() => navigate('/tasks')} style={{ ...cardStyle, ...tileStyle }}>
          <span style={tileLabelStyle}>משימות פתוחות</span>
          <span style={tileValueStyle}>{data?.openTasks == null ? <Skeleton width={36} height={26} /> : data.openTasks}</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={() => navigate('/orders/new')} style={{ ...primaryButtonStyle, flex: 1, padding: '0 8px' }}>
          + הזמנה חדשה
        </button>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          aria-expanded={exportOpen}
          style={{ ...secondaryButtonStyle, flex: 1, padding: '0 8px' }}
        >
          ייצוא חשבוניות
        </button>
        <button
          type="button"
          onClick={() => navigate(`/products?collection=${encodeURIComponent(ENGAGEMENT_RINGS)}`)}
          style={{ ...secondaryButtonStyle, flex: 1, padding: '0 8px' }}
        >
          טבעות אירוסין
        </button>
      </div>

      {exportOpen && <InvoiceExport onClose={() => setExportOpen(false)} />}

      <div className="home-account" style={{ ...cardStyle, marginTop: 24, textAlign: 'center' }}>
        <div style={mutedTextStyle}>מחוברת כ-{userEmail}</div>
        <button type="button" onClick={onSignOut} style={signOutStyle}>
          התנתקות
        </button>
      </div>
    </div>
  )
}

// A month of invoices as one ZIP for the accountant. It starts on last month, the one usually asked for.
function InvoiceExport({ onClose }: { onClose: () => void }) {
  const options = lastMonths(12)
  const [value, setValue] = useState(options[0].value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    const [year, month] = value.split('-').map(Number)
    const range = periodRange(year, month)!
    setBusy(true)
    setError(null)
    try {
      await downloadFile(`/invoices/export?from=${range.from}&to=${range.to}`, `invoices-${range.from}_${range.to}.zip`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הייצוא נכשל')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ ...cardStyle, marginTop: 10 }}>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>החודש לייצוא</label>
      <select value={value} onChange={(e) => setValue(e.target.value)} style={selectStyle}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" disabled={busy} onClick={() => void download()} style={{ ...primaryButtonStyle, flex: 1 }}>
          {busy ? 'מכין קובץ...' : 'הורדת ZIP'}
        </button>
        <button type="button" onClick={onClose} style={secondaryButtonStyle}>
          סגירה
        </button>
      </div>
      {error && <p style={{ ...errorTextStyle, marginTop: 8 }}>{error}</p>}
    </div>
  )
}

// The last n months, newest first, starting with the month before the current one.
function lastMonths(n: number): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = []
  const today = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const month = d.getMonth() + 1
    result.push({
      value: `${d.getFullYear()}-${String(month).padStart(2, '0')}`,
      label: `${monthName(month)} ${d.getFullYear()}`,
    })
  }
  return result
}

const needsStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginBottom: 12,
  padding: '12px 14px',
  border: '1px solid var(--warning)',
  borderRadius: 10,
  background: 'var(--warning-bg)',
  color: 'var(--warning)',
  textAlign: 'right',
  cursor: 'pointer',
  font: 'inherit',
}

const monthCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  width: '100%',
  border: 'none',
  textAlign: 'right',
  cursor: 'pointer',
  font: 'inherit',
  padding: '16px',
}

const tileStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  border: 'none',
  textAlign: 'right',
  cursor: 'pointer',
  font: 'inherit',
  padding: '14px',
}

const tileLabelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)' }
const tileValueStyle: React.CSSProperties = { fontSize: 26, fontWeight: 700 }

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  fontSize: 16,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
}

const signOutStyle: React.CSSProperties = {
  marginTop: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 15,
  cursor: 'pointer',
}

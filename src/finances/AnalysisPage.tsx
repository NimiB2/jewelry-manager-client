import { useEffect, useState, type CSSProperties } from 'react'
import { apiJson } from '../api'
import { monthName } from '../orders/dates'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle } from '../products/productStyles'
import { SubNav } from '../shell/SubNav'
import { subItemsOf } from '../shell/navItems'
import { categoryLook } from './categoryEmoji'
import { selectStyle } from './styles'

type Month = { month: number; income: number; expenses: number; salary: number; workHours: number; orders: number }
type Slice = { name: string; amount: number; percent: number; count: number; previousAmount: number }
type Top = { name: string; revenue: number; quantity: number }
type Analysis = {
  year: number
  month: number | null
  months: Month[]
  totals: {
    income: number
    expenses: number
    salary: number
    workHours: number
    orders: number
    averageOrder: number
    incomePerHour: number | null
    fixedExpenses: number
    variableExpenses: number
  }
  byGroup: Slice[]
  byCategory: Slice[]
  topProducts: Top[]
  topMaterials: Top[]
}

const hoursFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 })

// Understanding the money: where the expenses went, what her work hours were worth each month, and what sells.
export function AnalysisPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [data, setData] = useState<Analysis | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const query = month === null ? `year=${year}` : `year=${year}&month=${month}`
    apiJson<Analysis>(`/finances/analysis?${query}`)
      .then((result) => {
        if (!current) return
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (current) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      current = false
    }
  }, [year, month])

  useEffect(() => {
    apiJson<number[]>('/finances/years').then(setYears).catch(() => setYears([]))
  }, [])

  const yearOptions = [...new Set([...years, year, now.getFullYear()])].sort((a, b) => b - a)
  const totals = data?.totals
  const maxMonth = data ? Math.max(1, ...data.months.map((m) => Math.max(m.income, m.expenses))) : 1
  const periodLabel = month === null ? `שנת ${year}` : `${monthName(month)} ${year}`

  return (
    <div className="screen">
      <h1 style={{ margin: '0 0 8px' }}>כספים</h1>
      <SubNav items={subItemsOf('finances', { page: 'finances', view: 'analysis' })} />

      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <select value={month ?? ''} onChange={(e) => setMonth(e.target.value === '' ? null : Number(e.target.value))} aria-label="חודש" style={{ ...selectStyle, flex: 1 }}>
          <option value="">כל השנה</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="שנה" style={{ ...selectStyle, width: 110 }}>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={errorTextStyle}>{error}</p>}
      {!data && !error && <p style={mutedTextStyle}>טוען...</p>}

      {data && totals && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Figure label="הכנסות" value={formatMoney(totals.income)} />
            <Figure label="הוצאות" value={formatMoney(totals.expenses)} />
            <Figure
              label="רווח (הכנסות פחות הוצאות)"
              value={formatMoney(totals.income - totals.expenses)}
              color={totals.income - totals.expenses < 0 ? 'var(--danger)' : 'var(--success)'}
            />
            <Figure label={`משכורת · ${hoursFormat.format(totals.workHours)} שעות`} value={formatMoney(totals.salary)} />
            <Figure
              label="רווח אחרי משכורת"
              value={formatMoney(totals.income - totals.expenses - totals.salary)}
              color={totals.income - totals.expenses - totals.salary < 0 ? 'var(--danger)' : 'var(--success)'}
            />
            <Figure
              label="הכנסה לשעת עבודה"
              value={totals.incomePerHour === null ? '—' : formatMoney(totals.incomePerHour)}
            />
          </section>

          <section style={cardStyle}>
            <h2 style={headingStyle}>משכורת לפי חודש</h2>
            <p style={{ ...mutedTextStyle, margin: '0 0 8px' }}>שעות העבודה של כל תכשיט בהזמנות כפול תעריף השעה שהיה בזמן ההזמנה.</p>
            {data.months.map((m) => (
              <div key={m.month} style={monthRowStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <button
                    type="button"
                    onClick={() => setMonth(month === m.month ? null : m.month)}
                    style={{ ...linkButtonStyle, fontWeight: month === m.month ? 700 : 500 }}
                  >
                    {monthName(m.month)}
                  </button>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>
                    {m.salary > 0 ? formatMoney(m.salary) : '—'}
                    <span style={{ ...mutedTextStyle, fontWeight: 400 }}> · {hoursFormat.format(m.workHours)} ש׳ · {m.orders} הזמנות</span>
                  </span>
                </div>
                <Bar value={m.income} max={maxMonth} color="var(--success)" label={`הכנסות ${formatMoney(m.income)}`} />
                <Bar value={m.expenses} max={maxMonth} color="var(--danger)" label={`הוצאות ${formatMoney(m.expenses)}`} />
              </div>
            ))}
          </section>

          <Breakdown title={`הוצאות לפי סוג · ${periodLabel}`} slices={data.byGroup} month={month} />
          <Breakdown title={`הוצאות לפי קטגוריה · ${periodLabel}`} slices={data.byCategory} month={month} emoji />

          <section style={cardStyle}>
            <h2 style={headingStyle}>עוד תובנות</h2>
            <Line label="הוצאות קבועות" value={formatMoney(totals.fixedExpenses)} />
            <Line label="הוצאות משתנות" value={formatMoney(totals.variableExpenses)} />
            <Line label="הזמנות בתקופה" value={String(totals.orders)} />
            <Line label="ממוצע להזמנה" value={totals.orders > 0 ? formatMoney(totals.averageOrder) : '—'} />
          </section>

          <TopList title="המוצרים שהכניסו הכי הרבה" items={data.topProducts} />
          <TopList title="החומרים שהכניסו הכי הרבה" items={data.topMaterials} />
        </div>
      )}
    </div>
  )
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ ...mutedTextStyle, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }} title={label}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color }} />
      </div>
      <span style={{ ...mutedTextStyle, fontSize: 11, width: 92, textAlign: 'left' }}>{formatMoney(value)}</span>
    </div>
  )
}

// A share of the expenses as a bar; the arrow compares it with the period before (last month, or last year).
function Breakdown({ title, slices, month, emoji }: { title: string; slices: Slice[]; month: number | null; emoji?: boolean }) {
  return (
    <section style={cardStyle}>
      <h2 style={headingStyle}>{title}</h2>
      {slices.length === 0 && <p style={mutedTextStyle}>אין הוצאות בתקופה הזו.</p>}
      {slices.map((s) => {
        const look = emoji ? categoryLook(s.name) : { emoji: '', label: s.name }
        const diff = s.amount - s.previousAmount
        return (
          <div key={s.name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
              <span>
                {emoji ? `${look.emoji} ` : ''}
                {look.label} <span style={mutedTextStyle}>· {s.count}</span>
              </span>
              <b>
                {formatMoney(s.amount)} <span style={{ ...mutedTextStyle, fontWeight: 400 }}>({s.percent}%)</span>
              </b>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{ width: `${s.percent}%`, height: '100%', background: 'var(--accent)' }} />
            </div>
            {s.previousAmount > 0 && diff !== 0 && (
              <div style={{ ...mutedTextStyle, fontSize: 11, marginTop: 2 }}>
                {diff > 0 ? '▲' : '▼'} {formatMoney(Math.abs(diff))} {diff > 0 ? 'יותר' : 'פחות'} מ{month === null ? 'השנה שעברה' : 'החודש הקודם'}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}

function TopList({ title, items }: { title: string; items: Top[] }) {
  if (items.length === 0) return null
  return (
    <section style={cardStyle}>
      <h2 style={headingStyle}>{title}</h2>
      {items.map((t, i) => (
        <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
          <span>
            {i + 1}. {t.name} <span style={mutedTextStyle}>· {t.quantity} יח׳</span>
          </span>
          <b>{formatMoney(t.revenue)}</b>
        </div>
      ))}
    </section>
  )
}

const headingStyle: CSSProperties = { margin: '0 0 8px', fontSize: 16 }

const monthRowStyle: CSSProperties = { padding: '8px 0', borderBottom: '1px solid var(--border)' }

const linkButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: 15,
  color: 'var(--text)',
  cursor: 'pointer',
}

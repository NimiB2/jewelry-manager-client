import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { apiJson } from '../api'
import { monthName } from '../orders/dates'
import { formatMoney } from '../products/format'
import { errorTextStyle, mutedTextStyle } from '../products/productStyles'
import { SubNav } from '../shell/SubNav'
import { subItemsOf } from '../shell/navItems'
import { categoryLook } from './categoryEmoji'
import { selectStyle } from './styles'

type Month = { month: number; income: number; expenses: number; salary: number; workHours: number; orders: number }
type Slice = { name: string; amount: number; percent: number; count: number; previousAmount: number }
type Pair = { group: string; category: string; amount: number; count: number; previousAmount: number }
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
  byGroupCategory: Pair[]
  topProducts: Top[]
  topMaterials: Top[]
}

type View = 'expenses' | 'salary' | 'products'

const hoursFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 })

// Colours for the share bar; the same order is used for the dots in the list.
const PALETTE = ['#378ADD', '#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#D4537E', '#639922', '#888780']

// Name of the seeded expense group that holds the costs of making orders (materials, stones, setting).
const ORDER_GROUP = 'הוצאות הזמנות'

// Categories below this share of the expenses are folded into one "other" row.
const SMALL_SHARE = 3

// Understanding the money, in a compact layout: one summary strip, then one view at a time.
export function AnalysisPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [view, setView] = useState<View>('expenses')
  const [group, setGroup] = useState<string | null>(null)
  const [showSmall, setShowSmall] = useState(false)
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

  // The categories of the chosen group (or of everything), with their share of what is shown.
  const rows = useMemo(() => {
    if (!data) return []
    const source: Slice[] =
      group === null
        ? data.byCategory
        : data.byGroupCategory
            .filter((p) => p.group === group)
            .map((p) => ({ name: p.category, amount: p.amount, count: p.count, previousAmount: p.previousAmount, percent: 0 }))
    const total = source.reduce((sum, s) => sum + s.amount, 0)
    return source
      .map((s) => ({ ...s, percent: total > 0 ? Math.round((s.amount / total) * 1000) / 10 : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [data, group])

  const yearOptions = [...new Set([...years, year, now.getFullYear()])].sort((a, b) => b - a)
  const totals = data?.totals
  const net = totals ? totals.income - totals.expenses : 0
  const main = rows.filter((r) => r.percent >= SMALL_SHARE)
  const small = rows.filter((r) => r.percent < SMALL_SHARE)
  const smallTotal = small.reduce((sum, r) => sum + r.amount, 0)
  const smallPercent = Math.round(small.reduce((sum, r) => sum + r.percent, 0) * 10) / 10
  const colorOf = (index: number) => PALETTE[Math.min(index, PALETTE.length - 1)]
  const orderCosts = data?.byGroup.find((g) => g.name === ORDER_GROUP)?.amount ?? 0
  const maxSalary =data ? Math.max(1, ...data.months.map((m) => m.salary)) : 1
  const periodLabel = month === null ? `שנת ${year}` : `${monthName(month)} ${year}`

  return (
    <div className="screen">
      <h1 style={{ margin: '0 0 8px' }}>כספים</h1>
      <SubNav items={subItemsOf('finances', { page: 'finances', view: 'analysis' })} />

      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <select
          value={month ?? ''}
          onChange={(e) => setMonth(e.target.value === '' ? null : Number(e.target.value))}
          aria-label="חודש"
          style={{ ...selectStyle, flex: 1 }}
        >
          <option value="">כל השנה</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="שנה" style={{ ...selectStyle, width: 104 }}>
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
        <>
          <section style={stripCardStyle} aria-label={`סיכום ${periodLabel}`}>
            <div style={kpiGridStyle}>
              <Kpi label="הכנסות" value={formatMoney(totals.income)} />
              <Kpi label="הוצאות" value={formatMoney(totals.expenses)} />
              <Kpi label="רווח" value={formatMoney(net)} color={net < 0 ? 'var(--danger)' : 'var(--success)'} />
              <Kpi label="משכורת" value={formatMoney(totals.salary)} />
            </div>
            <div style={subStripStyle}>
              <span>אחרי משכורת: {formatMoney(net - totals.salary)}</span>
              <span>
                {hoursFormat.format(totals.workHours)} ש׳ · לשעה: {totals.incomePerHour === null ? '—' : formatMoney(totals.incomePerHour)}
              </span>
            </div>
          </section>

          <div style={tabsStyle} role="tablist">
            {(
              [
                ['expenses', 'הוצאות'],
                ['salary', 'משכורת'],
                ['products', 'מוצרים'],
              ] as [View, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                style={tabStyle(view === key)}
              >
                {label}
              </button>
            ))}
          </div>

          {view === 'expenses' && (
            <section>
              {rows.length === 0 && <p style={mutedTextStyle}>אין הוצאות בתקופה הזו.</p>}

              {data.byGroup.length > 0 && (
                <div style={{ ...stripCardStyle, marginBottom: 10 }}>
                  <div style={{ ...mutedTextStyle, fontSize: 12 }}>לאן הלכו ההוצאות</div>
                  <div style={shareBarStyle} aria-hidden>
                    {data.byGroup.map((g, i) => (
                      <i key={g.name} style={{ width: `${g.percent}%`, background: colorOf(i) }} />
                    ))}
                  </div>
                  {data.byGroup.map((g, i) => (
                    <div key={g.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                      <span>
                        <span style={{ ...dotStyle, background: colorOf(i), marginLeft: 6 }} />
                        {g.name}
                      </span>
                      <span>
                        {formatMoney(g.amount)} · {g.percent}%
                      </span>
                    </div>
                  ))}
                  {orderCosts > 0 && (
                    <div style={{ ...subStripStyle, justifyContent: 'space-between' }}>
                      <span>רווח גולמי מהזמנות (הכנסות פחות {ORDER_GROUP})</span>
                      <b style={{ fontWeight: 500, color: 'var(--text)' }}>{formatMoney(totals.income - orderCosts)}</b>
                    </div>
                  )}
                </div>
              )}

              {rows.length > 0 && (
                <div style={shareBarStyle} aria-hidden>
                  {main.map((r, i) => (
                    <i key={r.name} style={{ width: `${r.percent}%`, background: colorOf(i) }} />
                  ))}
                  {smallPercent > 0 && <i style={{ width: `${smallPercent}%`, background: PALETTE[PALETTE.length - 1] }} />}
                </div>
              )}

              {data.byGroup.length > 1 && (
                <div style={chipsRowStyle} role="group" aria-label="סוג הוצאה">
                  <button type="button" onClick={() => setGroup(null)} style={groupChipStyle(group === null)}>
                    הכל
                  </button>
                  {data.byGroup.map((g) => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setGroup(group === g.name ? null : g.name)}
                      style={groupChipStyle(group === g.name)}
                    >
                      {g.name} · {formatMoney(g.amount)}
                    </button>
                  ))}
                </div>
              )}

              {main.map((r, i) => (
                <ExpenseRow key={r.name} slice={r} color={colorOf(i)} month={month} />
              ))}

              {small.length > 0 && (
                <>
                  <button type="button" onClick={() => setShowSmall((v) => !v)} style={rowButtonStyle}>
                    <span style={{ ...dotStyle, background: PALETTE[PALETTE.length - 1] }} />
                    <span style={{ textAlign: 'right' }}>אחר · {small.length} קטגוריות קטנות</span>
                    <b style={{ fontWeight: 500 }}>{formatMoney(smallTotal)}</b>
                    <span style={percentStyle}>{smallPercent}%</span>
                    <span style={{ ...mutedTextStyle, textAlign: 'center' }}>{showSmall ? '−' : '+'}</span>
                  </button>
                  {showSmall &&
                    small.map((r) => <ExpenseRow key={r.name} slice={r} color={PALETTE[PALETTE.length - 1]} month={month} />)}
                </>
              )}

              {rows.length > 0 && (
                <div style={{ ...mutedTextStyle, fontSize: 12, marginTop: 8 }}>
                  קבועות {formatMoney(totals.fixedExpenses)} · משתנות {formatMoney(totals.variableExpenses)}
                  {totals.orders > 0 && ` · ממוצע להזמנה ${formatMoney(totals.averageOrder)}`}
                </div>
              )}
            </section>
          )}

          {view === 'salary' && (
            <section>
              <p style={{ ...mutedTextStyle, fontSize: 12, margin: '0 0 4px' }}>
                שעות העבודה של ההזמנות כפול תעריף השעה ששמור בכל הזמנה. לחיצה על חודש פותחת את ההוצאות שלו.
              </p>
              {data.months.map((m) => (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => {
                    setMonth(m.month)
                    setView('expenses')
                  }}
                  style={salaryRowStyle}
                >
                  <span style={{ textAlign: 'right' }}>{monthName(m.month).slice(0, 5)}</span>
                  <span style={salaryTrackStyle}>
                    <i style={{ display: 'block', height: '100%', width: `${(m.salary / maxSalary) * 100}%`, background: 'var(--accent)' }} />
                  </span>
                  <b style={{ fontWeight: 500 }}>{m.salary > 0 ? formatMoney(m.salary) : '—'}</b>
                  <span style={{ ...mutedTextStyle, fontSize: 11 }}>
                    {m.workHours > 0 ? `${hoursFormat.format(m.workHours)} ש׳` : ''}
                  </span>
                </button>
              ))}
            </section>
          )}

          {view === 'products' && (
            <section>
              <TopList title="מוצרים" items={data.topProducts} />
              <TopList title="חומרים" items={data.topMaterials} />
              {data.topProducts.length === 0 && <p style={mutedTextStyle}>אין הזמנות בתקופה הזו.</p>}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: color ?? 'var(--text)', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

// One category on one line: picture, name, amount, share, and an arrow against the period before.
function ExpenseRow({ slice, color, month }: { slice: Slice; color: string; month: number | null }) {
  const look = categoryLook(slice.name)
  const diff = slice.amount - slice.previousAmount
  const hasPrevious = slice.previousAmount > 0 && diff !== 0
  return (
    <div style={rowStyle}>
      <span style={{ ...dotStyle, background: color }} />
      <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span aria-hidden>{look.emoji} </span>
        {look.label}
      </span>
      <b style={{ fontWeight: 500 }}>{formatMoney(slice.amount)}</b>
      <span style={percentStyle}>{slice.percent}%</span>
      <span
        style={{ fontSize: 11, textAlign: 'center', color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}
        title={
          hasPrevious
            ? `${formatMoney(Math.abs(diff))} ${diff > 0 ? 'יותר' : 'פחות'} מ${month === null ? 'השנה שעברה' : 'החודש הקודם'}`
            : undefined
        }
      >
        {hasPrevious ? (diff > 0 ? '▲' : '▼') : ''}
      </span>
    </div>
  )
}

function TopList({ title, items }: { title: string; items: Top[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...mutedTextStyle, fontSize: 12, margin: '2px 0' }}>{title}</div>
      {items.map((t, i) => (
        <div key={t.name} style={{ ...rowStyle, gridTemplateColumns: '1fr auto 44px' }}>
          <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {i + 1}. {t.name}
          </span>
          <b style={{ fontWeight: 500 }}>{formatMoney(t.revenue)}</b>
          <span style={{ ...mutedTextStyle, fontSize: 11 }}>{t.quantity} יח׳</span>
        </div>
      ))}
    </div>
  )
}

const stripCardStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 10px 8px',
}

const kpiGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }

const subStripStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  marginTop: 8,
  paddingTop: 6,
  borderTop: '1px solid var(--border)',
  fontSize: 12,
  color: 'var(--text-muted)',
}

const tabsStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: 3,
  margin: '10px 0',
  borderRadius: 10,
  background: 'var(--border)',
}

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 34,
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
  }
}

const shareBarStyle: CSSProperties = {
  display: 'flex',
  height: 12,
  borderRadius: 6,
  overflow: 'hidden',
  background: 'var(--border)',
  margin: '2px 0 8px',
}

const chipsRowStyle: CSSProperties = { display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 4, paddingBottom: 2 }

function groupChipStyle(active: boolean): CSSProperties {
  return {
    flex: '0 0 auto',
    minHeight: 30,
    padding: '0 10px',
    borderRadius: 15,
    fontSize: 12,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontWeight: active ? 700 : 400,
  }
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '10px minmax(0, 1fr) auto 40px 16px',
  gap: 8,
  alignItems: 'center',
  minHeight: 34,
  borderBottom: '1px solid var(--border)',
  fontSize: 14,
}

const rowButtonStyle: CSSProperties = {
  ...rowStyle,
  width: '100%',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  background: 'transparent',
  padding: 0,
  color: 'var(--text)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const dotStyle: CSSProperties = { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }

const percentStyle: CSSProperties = { fontSize: 12, color: 'var(--text-muted)', textAlign: 'left' }

const salaryRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '48px minmax(0, 1fr) 64px 44px',
  gap: 8,
  alignItems: 'center',
  width: '100%',
  minHeight: 34,
  border: 'none',
  borderBottom: '1px solid var(--border)',
  background: 'transparent',
  padding: 0,
  fontSize: 14,
  color: 'var(--text)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const salaryTrackStyle: CSSProperties = {
  display: 'block',
  height: 6,
  borderRadius: 3,
  background: 'var(--border)',
  overflow: 'hidden',
}

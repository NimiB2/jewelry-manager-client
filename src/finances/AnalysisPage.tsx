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

// One colour per group; the same colour marks the group's dot and its share bar.
const PALETTE = ['#378ADD', '#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#D4537E', '#639922', '#888780']

// Name the server gives to expenses (or categories) that belong to no group.
const NO_GROUP = 'ללא קבוצה'

// Understanding the money in one glance: income, expenses and what is left; then where the money went,
// by group, opening a group shows its categories.
export function AnalysisPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [view, setView] = useState<View>('expenses')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
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
        setOpenGroup(null)
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

  // The categories of each group, biggest first, with their share of the group.
  const categoriesByGroup = useMemo(() => {
    const map = new Map<string, Slice[]>()
    for (const pair of data?.byGroupCategory ?? []) {
      map.set(pair.group, [
        ...(map.get(pair.group) ?? []),
        { name: pair.category, amount: pair.amount, count: pair.count, previousAmount: pair.previousAmount, percent: 0 },
      ])
    }
    for (const [group, list] of map) {
      const total = list.reduce((sum, s) => sum + s.amount, 0)
      map.set(
        group,
        list
          .map((s) => ({ ...s, percent: total > 0 ? Math.round((s.amount / total) * 100) : 0 }))
          .sort((a, b) => b.amount - a.amount),
      )
    }
    return map
  }, [data])

  const yearOptions = [...new Set([...years, year, now.getFullYear()])].sort((a, b) => b - a)
  const totals = data?.totals
  const net = totals ? totals.income - totals.expenses : 0
  const maxSalary = data ? Math.max(1, ...data.months.map((m) => m.salary)) : 1
  const periodLabel = month === null ? `שנת ${year}` : `${monthName(month)} ${year}`

  // Last month's expenses, for the one comparison sentence. Not available for a whole year or January.
  const previousExpenses = data && month !== null && month > 1 ? data.months[month - 2].expenses : null
  const expensesDiff = totals && previousExpenses !== null ? totals.expenses - previousExpenses : null

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
              <Kpi label="נשאר" value={formatMoney(net)} color={net < 0 ? 'var(--danger)' : 'var(--success)'} />
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
              {data.byGroup.length === 0 && <p style={mutedTextStyle}>אין הוצאות בתקופה הזו.</p>}

              {data.byGroup.length > 0 && (
                <>
                  <div style={shareBarStyle} aria-hidden>
                    {data.byGroup.map((g, i) => (
                      <i key={g.name} style={{ width: `${g.percent}%`, background: colorOf(g, i) }} />
                    ))}
                  </div>

                  <div style={listStyle}>
                    {data.byGroup.map((g, i) => {
                      const open = openGroup === g.name
                      const categories = categoriesByGroup.get(g.name) ?? []
                      return (
                        <div key={g.name}>
                          <button
                            type="button"
                            onClick={() => setOpenGroup(open ? null : g.name)}
                            aria-expanded={open}
                            style={groupRowStyle}
                          >
                            <span style={{ ...dotStyle, background: colorOf(g, i) }} />
                            <span style={{ textAlign: 'right', fontWeight: 500 }}>
                              {g.name}
                              {g.name === NO_GROUP && <span style={{ ...mutedTextStyle, fontSize: 12 }}> · {categories.length} קטגוריות</span>}
                            </span>
                            <b style={{ fontWeight: 500 }}>{formatMoney(g.amount)}</b>
                            <span style={percentStyle}>{g.percent}%</span>
                            <span aria-hidden style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              {open ? '▲' : '▼'}
                            </span>
                          </button>

                          {open && (
                            <div style={categoriesStyle}>
                              {categories.map((c) => (
                                <CategoryRow key={c.name} slice={c} month={month} />
                              ))}
                              {g.name === NO_GROUP && (
                                <a href="#/settings" style={hintLinkStyle}>
                                  אפשר לשייך קטגוריות לקבוצה בהגדרות האישיות ←
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {expensesDiff !== null && expensesDiff !== 0 && (
                <div style={{ ...mutedTextStyle, fontSize: 13, marginTop: 10 }}>
                  בחודש שעבר הוצאת {formatMoney(previousExpenses ?? 0)}, החודש{' '}
                  <b style={{ color: expensesDiff > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 500 }}>
                    {formatMoney(Math.abs(expensesDiff))} {expensesDiff > 0 ? 'יותר' : 'פחות'}
                  </b>
                </div>
              )}
            </section>
          )}

          {view === 'salary' && (
            <section>
              <div style={{ ...stripCardStyle, marginBottom: 10 }}>
                <div style={kpiGridStyle}>
                  <Kpi label="משכורת" value={formatMoney(totals.salary)} />
                  <Kpi label="אחרי משכורת" value={formatMoney(net - totals.salary)} />
                  <Kpi
                    label={`${hoursFormat.format(totals.workHours)} ש׳ · לשעה`}
                    value={totals.incomePerHour === null ? '—' : formatMoney(totals.incomePerHour)}
                  />
                </div>
              </div>
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
              {totals.orders > 0 && (
                <p style={{ ...mutedTextStyle, fontSize: 13, margin: '0 0 8px' }}>
                  {totals.orders} הזמנות · ממוצע להזמנה {formatMoney(totals.averageOrder)}
                </p>
              )}
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

function colorOf(group: Slice, index: number): string {
  return group.name === NO_GROUP ? PALETTE[PALETTE.length - 1] : PALETTE[Math.min(index, PALETTE.length - 2)]
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: color ?? 'var(--text)', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

// One category inside an opened group: picture, name, amount and how it changed against the period before.
function CategoryRow({ slice, month }: { slice: Slice; month: number | null }) {
  const look = categoryLook(slice.name)
  const diff = slice.amount - slice.previousAmount
  const hasPrevious = slice.previousAmount > 0 && diff !== 0
  return (
    <div style={categoryRowStyle}>
      <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span aria-hidden>{look.emoji} </span>
        {look.label}
      </span>
      <b style={{ fontWeight: 500 }}>{formatMoney(slice.amount)}</b>
      <span
        style={{ fontSize: 11, textAlign: 'left', color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}
        title={hasPrevious ? `לעומת ${month === null ? 'השנה שעברה' : 'החודש הקודם'}` : undefined}
      >
        {hasPrevious ? `${diff > 0 ? '▲' : '▼'} ${formatMoney(Math.abs(diff))}` : ''}
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
        <div key={t.name} style={{ ...categoryRowStyle, gridTemplateColumns: 'minmax(0, 1fr) auto 44px', paddingInline: 0 }}>
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
  padding: '12px 10px',
}

const kpiGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }

const tabsStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: 3,
  margin: '12px 0',
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
  height: 10,
  borderRadius: 5,
  overflow: 'hidden',
  background: 'var(--border)',
  margin: '2px 0 8px',
}

const listStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  overflow: 'hidden',
}

const groupRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '10px minmax(0, 1fr) auto 40px 14px',
  gap: 8,
  alignItems: 'center',
  width: '100%',
  minHeight: 48,
  padding: '0 12px',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 15,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const categoriesStyle: CSSProperties = {
  padding: '2px 12px 6px',
  background: 'var(--bg)',
  borderBottom: '1px solid var(--border)',
}

const categoryRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto 76px',
  gap: 8,
  alignItems: 'center',
  minHeight: 34,
  borderBottom: '1px solid var(--border)',
  fontSize: 14,
}

const hintLinkStyle: CSSProperties = {
  display: 'block',
  padding: '8px 0 4px',
  fontSize: 13,
  color: 'var(--accent)',
  textDecoration: 'none',
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

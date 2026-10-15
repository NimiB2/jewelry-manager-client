import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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
type OrderSalary = { number: number; customer: string | null; hours: number; rate: number; salary: number }
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
    orderCosts: number
    homeExpenses: number
    businessExpenses: number
  }
  byGroup: Slice[]
  byCategory: Slice[]
  byGroupCategory: Pair[]
  topProducts: Top[]
  topMaterials: Top[]
  previous: { income: number; expenses: number }
  trend: { year: number; month: number; income: number; expenses: number }[]
  orderSalaries: OrderSalary[]
}

type View = 'overview' | 'expenses' | 'pay' | 'products'

const hoursFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 })

// One colour per group; the same colour marks the group's dot and its share bar.
const PALETTE = ['#378ADD', '#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#D4537E', '#639922', '#888780']

// Name the server gives to expenses (or categories) that belong to no group.
const NO_GROUP = 'ללא קבוצה'

const whole = (value: number) => formatMoney(Math.round(value))

// A change against the period before, as a percentage; null when there is nothing to compare with.
function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

// The whole picture in four tabs: an overview, where the money went, what she can draw and what the
// business earns, and what sold.
export function AnalysisPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [view, setView] = useState<View>('overview')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [showAllOrders, setShowAllOrders] = useState(false)
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
        setShowAllOrders(false)
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

  // The categories of each group, biggest first.
  const categoriesByGroup = useMemo(() => {
    const map = new Map<string, Slice[]>()
    for (const pair of data?.byGroupCategory ?? []) {
      map.set(pair.group, [
        ...(map.get(pair.group) ?? []),
        { name: pair.category, amount: pair.amount, count: pair.count, previousAmount: pair.previousAmount, percent: 0 },
      ])
    }
    for (const [group, list] of map) map.set(group, list.sort((a, b) => b.amount - a.amount))
    return map
  }, [data])

  const yearOptions = [...new Set([...years, year, now.getFullYear()])].sort((a, b) => b - a)
  const totals = data?.totals
  const net = totals ? totals.income - totals.expenses : 0
  const previousNet = data ? data.previous.income - data.previous.expenses : 0
  const periodLabel = month === null ? `שנת ${year}` : `${monthName(month)} ${year}`
  const previousLabel = month === null ? `${year - 1}` : month === 1 ? `דצמבר ${year - 1}` : monthName(month - 1)

  // The business: income less what the orders cost and what the business spends. Home costs are paid
  // from the salary, so they are not a cost of the business.
  const profitBeforeSalary = totals ? totals.income - totals.orderCosts - totals.businessExpenses : 0
  const profitAfterSalary = totals ? profitBeforeSalary - totals.salary : 0
  const maxSalary = data ? Math.max(1, ...data.months.map((m) => m.salary)) : 1

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

      <div style={tabsStyle} role="tablist">
        {(
          [
            ['overview', 'סקירה'],
            ['expenses', 'הוצאות'],
            ['pay', 'משכורת ורווח'],
            ['products', 'מוצרים'],
          ] as [View, string][]
        ).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} style={tabStyle(view === key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <p style={errorTextStyle}>{error}</p>}
      {!data && !error && <p style={mutedTextStyle}>טוען...</p>}

      {data && totals && (
        <>
          {view === 'overview' && (
            <section aria-label={`סקירה ${periodLabel}`}>
              <Card>
                <div style={kpiGridStyle}>
                  <Kpi label="הכנסות" value={whole(totals.income)} change={changePercent(totals.income, data.previous.income)} goodWhenUp />
                  <Kpi label="הוצאות" value={whole(totals.expenses)} change={changePercent(totals.expenses, data.previous.expenses)} />
                  <Kpi
                    label="נשאר"
                    value={whole(net)}
                    color={net < 0 ? 'var(--danger)' : 'var(--success)'}
                    change={changePercent(net, previousNet)}
                    goodWhenUp
                  />
                </div>
                <div style={{ ...smallMutedStyle, textAlign: 'center', marginTop: 6 }}>לעומת {previousLabel}</div>
              </Card>

              <Card title="הכנסות והוצאות, 6 חודשים אחרונים">
                <TrendChart points={data.trend} />
              </Card>

              <Card title="שווה לשים לב">
                <Insights data={data} profitBeforeSalary={profitBeforeSalary} previousLabel={previousLabel} />
              </Card>
            </section>
          )}

          {view === 'expenses' && (
            <section>
              {data.byGroup.length === 0 && <p style={mutedTextStyle}>אין הוצאות בתקופה הזו.</p>}

              {data.byGroup.length > 0 && (
                <>
                  <Card>
                    <div style={shareBarStyle} aria-hidden>
                      {data.byGroup.map((g, i) => (
                        <i key={g.name} style={{ width: `${g.percent}%`, background: colorOf(g, i) }} />
                      ))}
                    </div>
                    <div style={smallMutedStyle}>
                      סך הכל {whole(totals.expenses)} · קבועות {whole(totals.fixedExpenses)} · משתנות {whole(totals.variableExpenses)}
                    </div>
                  </Card>

                  <div style={listStyle}>
                    {data.byGroup.map((g, i) => {
                      const open = openGroup === g.name
                      const categories = categoriesByGroup.get(g.name) ?? []
                      return (
                        <div key={g.name}>
                          <button type="button" onClick={() => setOpenGroup(open ? null : g.name)} aria-expanded={open} style={groupRowStyle}>
                            <span style={{ ...dotStyle, background: colorOf(g, i) }} />
                            <span style={{ textAlign: 'right', fontWeight: 500 }}>
                              {g.name}
                              {g.name === NO_GROUP && <span style={smallMutedStyle}> · {categories.length} קטגוריות</span>}
                            </span>
                            <b style={{ fontWeight: 500 }}>{whole(g.amount)}</b>
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
            </section>
          )}

          {view === 'pay' && (
            <section>
              <Card title="המשכורת שמגיעה לך">
                <div style={{ fontSize: 26, fontWeight: 600 }}>{whole(totals.salary)}</div>
                <div style={smallMutedStyle}>
                  {hoursFormat.format(totals.workHours)} שעות עבודה × תעריף השעה ששמור בכל הזמנה
                </div>

                {data.orderSalaries.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {(showAllOrders ? data.orderSalaries : data.orderSalaries.slice(0, 5)).map((o) => (
                      <div key={o.number} style={lineStyle}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          הזמנה {o.number}
                          {o.customer ? ` · ${o.customer}` : ''}
                        </span>
                        <span style={smallMutedStyle}>
                          {hoursFormat.format(o.hours)} ש׳ × {formatMoney(o.rate)} = <b style={{ color: 'var(--text)', fontWeight: 500 }}>{whole(o.salary)}</b>
                        </span>
                      </div>
                    ))}
                    {data.orderSalaries.length > 5 && (
                      <button type="button" onClick={() => setShowAllOrders((v) => !v)} style={linkButtonStyle}>
                        {showAllOrders ? 'הצגת פחות' : `עוד ${data.orderSalaries.length - 5} הזמנות`}
                      </button>
                    )}
                  </div>
                )}
                {data.orderSalaries.length === 0 && <p style={{ ...mutedTextStyle, margin: '8px 0 0' }}>אין הזמנות עם שעות עבודה בתקופה הזו.</p>}
              </Card>

              <Card title="כמה העסק מרוויח">
                <div style={lineStyle}>
                  <span>הכנסות</span>
                  <b style={moneyStyle}>{whole(totals.income)}</b>
                </div>
                <div style={lineStyle}>
                  <span>עלות חומרים להזמנות</span>
                  <b style={moneyStyle}>− {whole(totals.orderCosts)}</b>
                </div>
                <div style={lineStyle}>
                  <span>הוצאות עסק</span>
                  <b style={moneyStyle}>− {whole(totals.businessExpenses)}</b>
                </div>
                <Result label="רווח העסק, לפני משכורת" value={profitBeforeSalary} note="מה שהעסק מרוויח בלי קשר למשכורת" />
                <div style={{ ...lineStyle, marginTop: 8 }}>
                  <span>משכורת לפי שעות</span>
                  <b style={moneyStyle}>− {whole(totals.salary)}</b>
                </div>
                <Result label="רווח העסק, אחרי משכורת" value={profitAfterSalary} note="מה שנשאר בעסק אחרי שאת מושכת את כל המשכורת" />
                {totals.orderCosts === 0 && totals.income > 0 && (
                  <p style={noteStyle}>אין הוצאות מקושרות להזמנות בתקופה הזו, אז הרווח נראה גבוה מהמציאות. כדאי לוודא שקניות החומר נרשמו.</p>
                )}
                {totals.homeExpenses > 0 && (
                  <p style={{ ...smallMutedStyle, margin: '8px 0 0' }}>
                    הוצאות הבית ({whole(totals.homeExpenses)}) משולמות מהמשכורת ולא נספרות כהוצאת עסק.
                  </p>
                )}
              </Card>

              <Card title="כמה אפשר למשוך">
                <Withdraw salary={totals.salary} profit={profitBeforeSalary} home={totals.homeExpenses} />
              </Card>

              {month === null && (
                <Card title="משכורת לפי חודש">
                  {data.months.map((m) => (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => setMonth(m.month)}
                      style={salaryRowStyle}
                      aria-label={`${monthName(m.month)}, משכורת ${whole(m.salary)}`}
                    >
                      <span style={{ textAlign: 'right' }}>{monthName(m.month).slice(0, 5)}</span>
                      <span style={salaryTrackStyle}>
                        <i style={{ display: 'block', height: '100%', width: `${(m.salary / maxSalary) * 100}%`, background: 'var(--accent)' }} />
                      </span>
                      <b style={{ fontWeight: 500 }}>{m.salary > 0 ? whole(m.salary) : '—'}</b>
                      <span style={smallMutedStyle}>{m.workHours > 0 ? `${hoursFormat.format(m.workHours)} ש׳` : ''}</span>
                    </button>
                  ))}
                </Card>
              )}
            </section>
          )}

          {view === 'products' && (
            <section>
              <Card>
                <div style={{ ...kpiGridStyle, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <Kpi label="הזמנות" value={String(totals.orders)} />
                  <Kpi label="ממוצע להזמנה" value={totals.orders > 0 ? whole(totals.averageOrder) : '—'} />
                </div>
              </Card>
              {data.topProducts.length === 0 && <p style={mutedTextStyle}>אין הזמנות בתקופה הזו.</p>}
              <TopList title="מוצרים מובילים" items={data.topProducts} />
              <TopList title="חומרים" items={data.topMaterials} showShare />
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

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={cardStyle}>
      {title && <div style={cardTitleStyle}>{title}</div>}
      {children}
    </div>
  )
}

// A number with its label and, when there is a previous period, how much it moved.
function Kpi({
  label,
  value,
  color,
  change,
  goodWhenUp,
}: {
  label: string
  value: string
  color?: string
  change?: number | null
  goodWhenUp?: boolean
}) {
  const better = change !== null && change !== undefined && (goodWhenUp ? change > 0 : change < 0)
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: color ?? 'var(--text)', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      {change !== null && change !== undefined && change !== 0 && (
        <div style={{ fontSize: 11, color: better ? 'var(--success)' : 'var(--danger)' }}>
          {change > 0 ? '▲' : '▼'} {Math.abs(change)}%
        </div>
      )}
    </div>
  )
}

// A line of the profit statement: a bold total with a plain-words explanation under it.
function Result({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div style={{ ...resultStyle, background: value < 0 ? 'var(--danger-bg)' : 'var(--accent-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 17, fontWeight: 600, color: value < 0 ? 'var(--danger)' : 'var(--text)' }}>{whole(value)}</span>
      </div>
      <div style={smallMutedStyle}>{note}</div>
    </div>
  )
}

// How much of the salary the business can actually pay out.
function Withdraw({ salary, profit, home }: { salary: number; profit: number; home: number }) {
  if (salary <= 0) return <p style={{ ...mutedTextStyle, margin: 0 }}>אין משכורת בתקופה הזו.</p>

  const canPay = Math.max(0, Math.min(salary, profit))
  const share = Math.round((canPay / salary) * 100)
  const covers = profit >= salary
  return (
    <>
      <div style={trackStyle} aria-hidden>
        <i style={{ display: 'block', height: '100%', width: `${share}%`, background: covers ? 'var(--success)' : 'var(--warning)' }} />
      </div>
      <div style={{ ...lineStyle, borderBottom: 'none' }}>
        <span>{covers ? 'העסק יכול לשלם את כל המשכורת' : profit <= 0 ? 'העסק לא מרוויח מספיק כדי לשלם משכורת' : 'העסק יכול לשלם רק חלק מהמשכורת'}</span>
        <b style={moneyStyle}>
          {whole(canPay)} מתוך {whole(salary)}
        </b>
      </div>
      {home > 0 && (
        <div style={smallMutedStyle}>
          אחרי הוצאות הבית ({whole(home)}) נשארים {whole(canPay - home)} מהמשכורת
        </div>
      )}
    </>
  )
}

function TrendChart({ points }: { points: Analysis['trend'] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expenses]))
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 70 }}>
        {points.map((p) => (
          <div
            key={`${p.year}-${p.month}`}
            style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}
            title={`${monthName(p.month)}: הכנסות ${whole(p.income)}, הוצאות ${whole(p.expenses)}`}
          >
            <i style={{ width: 9, height: `${(p.income / max) * 100}%`, minHeight: p.income > 0 ? 2 : 0, background: 'var(--accent)' }} />
            <i style={{ width: 9, height: `${(p.expenses / max) * 100}%`, minHeight: p.expenses > 0 ? 2 : 0, background: 'var(--text-muted)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {points.map((p) => (
          <span key={`${p.year}-${p.month}`} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            {monthName(p.month).slice(0, 3)}
          </span>
        ))}
      </div>
      <div style={{ ...smallMutedStyle, marginTop: 6 }}>
        <i style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)' }} /> הכנסות &nbsp;
        <i style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--text-muted)' }} /> הוצאות
      </div>
    </>
  )
}

// Plain-language things that moved, picked by simple rules: nothing here is a guess.
function Insights({ data, profitBeforeSalary, previousLabel }: { data: Analysis; profitBeforeSalary: number; previousLabel: string }) {
  const items: ReactNode[] = []
  const { totals, previous } = data

  const expensesChange = changePercent(totals.expenses, previous.expenses)
  if (expensesChange !== null && Math.abs(expensesChange) >= 5) {
    items.push(
      <>
        ההוצאות {expensesChange > 0 ? 'עלו' : 'ירדו'} ב-{Math.abs(expensesChange)}% לעומת {previousLabel}
      </>,
    )
  }

  const rising = [...data.byCategory]
    .filter((c) => c.previousAmount > 0 && c.amount - c.previousAmount > 0)
    .sort((a, b) => b.amount - b.previousAmount - (a.amount - a.previousAmount))[0]
  if (rising) {
    items.push(
      <>
        {categoryLook(rising.name).label} עלתה ב-{whole(rising.amount - rising.previousAmount)} לעומת {previousLabel}
      </>,
    )
  }

  if (totals.salary > 0) {
    items.push(
      profitBeforeSalary >= totals.salary ? (
        <>העסק יכול לשלם את כל המשכורת ({whole(totals.salary)})</>
      ) : (
        <>העסק יכול לשלם רק {whole(Math.max(0, profitBeforeSalary))} מתוך משכורת של {whole(totals.salary)}</>
      ),
    )
  }

  const ungrouped = data.byGroup.find((g) => g.name === NO_GROUP)
  if (ungrouped && ungrouped.amount > 0) {
    items.push(
      <>
        {whole(ungrouped.amount)} הוצאות בלי קבוצה. <a href="#/settings" style={{ color: 'var(--accent)' }}>לשיוך בהגדרות</a>
      </>,
    )
  }

  if (items.length === 0) return <p style={{ ...mutedTextStyle, margin: 0 }}>אין שינויים בולטים בתקופה הזו.</p>
  return (
    <>
      {items.map((item, i) => (
        <div key={i} style={{ ...lineStyle, display: 'block' }}>
          {item}
        </div>
      ))}
    </>
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
      <b style={{ fontWeight: 500 }}>{whole(slice.amount)}</b>
      <span
        style={{ fontSize: 11, textAlign: 'left', color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}
        title={hasPrevious ? `לעומת ${month === null ? 'השנה שעברה' : 'החודש הקודם'}` : undefined}
      >
        {hasPrevious ? `${diff > 0 ? '▲' : '▼'} ${whole(Math.abs(diff))}` : ''}
      </span>
    </div>
  )
}

function TopList({ title, items, showShare }: { title: string; items: Top[]; showShare?: boolean }) {
  if (items.length === 0) return null
  const total = items.reduce((sum, t) => sum + t.revenue, 0)
  return (
    <Card title={title}>
      {items.map((t, i) => (
        <div key={t.name} style={lineStyle}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {i + 1}. {t.name}
          </span>
          <span>
            <b style={moneyStyle}>{whole(t.revenue)}</b>{' '}
            <span style={smallMutedStyle}>
              {showShare && total > 0 ? `${Math.round((t.revenue / total) * 100)}%` : `${t.quantity} יח׳`}
            </span>
          </span>
        </div>
      ))}
    </Card>
  )
}

const cardStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '12px',
  marginBottom: 10,
}

const cardTitleStyle: CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }

const smallMutedStyle: CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }

const kpiGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }

const lineStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
  padding: '7px 0',
  borderBottom: '1px solid var(--border)',
  fontSize: 14,
}

const moneyStyle: CSSProperties = { fontWeight: 500, whiteSpace: 'nowrap' }

const resultStyle: CSSProperties = { marginTop: 6, padding: '8px 10px', borderRadius: 10 }

const noteStyle: CSSProperties = {
  margin: '8px 0 0',
  padding: '6px 8px',
  borderRadius: 8,
  background: 'var(--warning-bg)',
  fontSize: 12,
}

const linkButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 13,
  padding: '8px 0 0',
  cursor: 'pointer',
}

const tabsStyle: CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: 3,
  margin: '0 0 12px',
  borderRadius: 10,
  background: 'var(--border)',
}

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 36,
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
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

const trackStyle: CSSProperties = { height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }

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

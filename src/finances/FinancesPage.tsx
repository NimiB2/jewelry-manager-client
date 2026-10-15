import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { PlusIcon } from '../icons/NavIcons'
import { formatOrderDate, monthName, periodRange } from '../orders/dates'
import { Toast } from '../orders/Toast'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { FilterTabs, tabStyle } from '../shell/FilterTabs'
import { SearchButton } from '../search/SearchButton'
import { Modal } from '../shell/Modal'
import { SkeletonCards } from '../shell/Skeleton'
import { subItemsOf } from '../shell/navItems'
import { SubNav } from '../shell/SubNav'
import { navigate } from '../shell/useRoute'
import { FinanceForm } from './FinanceForm'
import { selectStyle, smallPillStyle } from './styles'
import { INCOME_CATEGORY_LABELS, type FinanceItem, type FinanceList, type TypeFilter } from './types'

type ExpenseResponse = {
  id: string
  date: string
  category: 'FIXED' | 'VARIABLE'
  description: string
  amount: number
  hasReceipt: boolean
  seriesId: string | null
  repeatEveryMonths: number | null
  typeName: string | null
  orderId: string | null
  orderNumber: number | null
  invoiceFileName: string | null
  supplier: string | null
  notes: string | null
  groupName: string | null
}

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'income', label: 'הכנסות' },
  { value: 'expense', label: 'הוצאות' },
]

type FormState = { open: false } | { open: true; item: FinanceItem | null }

// The movements: a compact period bar and totals on top, so the records themselves are the page.
export function FinancesPage() {
  const now = new Date()
  const [data, setData] = useState<FinanceList | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ open: false })
  const [toast, setToast] = useState<string[] | null>(null)

  // The period is a year and/or month, or a free from-to range (opened from the period bar).
  const [customRange, setCustomRange] = useState(false)
  const [year, setYear] = useState<number | null>(now.getFullYear())
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [type, setType] = useState<TypeFilter>('all')
  const [invoice, setInvoice] = useState<'all' | 'missing' | 'has'>('all')

  // Expense groups she closed; every group starts open.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const requestCounter = useRef(0)

  function toggleGroup(title: string) {
    const next = new Set(collapsed)
    if (next.has(title)) next.delete(title)
    else next.add(title)
    setCollapsed(next)
  }

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ projected: 'true' })
    const range = customRange ? { from, to } : periodRange(year, month)
    if (range?.from) params.set('from', range.from)
    if (range?.to) params.set('to', range.to)
    if (type !== 'all') params.set('type', type)
    if (invoice !== 'all') params.set('receipt', invoice)
    return params
  }, [customRange, from, to, year, month, type, invoice])

  const load = useCallback(() => {
    const requestId = ++requestCounter.current
    apiJson<FinanceList>(`/finances?${buildQuery()}`)
      .then((list) => {
        if (requestId !== requestCounter.current) return
        setData(list)
        setError(null)
      })
      .catch((err) => {
        if (requestId === requestCounter.current) setError(err instanceof Error ? err.message : String(err))
      })
  }, [buildQuery])

  useEffect(load, [load])

  useEffect(() => {
    apiJson<number[]>('/finances/years').then(setYears).catch(() => setYears([]))
  }, [data])

  function pickYear(value: string) {
    setYear(value === '' ? null : Number(value))
    if (value === '') setMonth(null)
  }

  function pickMonth(value: string) {
    if (value === '') return setMonth(null)
    if (year === null) setYear(now.getFullYear())
    setMonth(Number(value))
  }

  function showThisMonth() {
    setCustomRange(false)
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  // The stepper moves one month at a time, or one year when a whole year is shown.
  function step(delta: number) {
    if (year === null) return
    if (month === null) {
      setYear(year + delta)
      return
    }
    const moved = new Date(year, month - 1 + delta, 1)
    setYear(moved.getFullYear())
    setMonth(moved.getMonth() + 1)
  }

  const closeForm = () => setForm({ open: false })
  const openForm = (item: FinanceItem | null) => setForm({ open: true, item })

  async function openRow(item: FinanceItem) {
    // Income from an order follows the order: it is changed through the order itself.
    if (item.kind === 'INCOME' && item.orderId) return navigate(`/orders/${item.orderId}`)

    // A coming occurrence does not exist yet; it opens the latest real one, where the series is managed.
    if (item.isProjected) {
      try {
        const e = await apiJson<ExpenseResponse>(`/expenses/${item.id}`)
        openForm({
          kind: 'EXPENSE', id: e.id, date: e.date, description: e.description, amount: e.amount,
          expenseCategory: e.category, incomeCategory: null, orderId: e.orderId, hasReceipt: e.hasReceipt,
          seriesId: e.seriesId, repeatEveryMonths: e.repeatEveryMonths, typeName: e.typeName,
          orderNumber: e.orderNumber, hasInvoiceFile: e.invoiceFileName != null, isProjected: false, supplier: e.supplier, notes: e.notes, groupName: e.groupName,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'הפתיחה נכשלה')
      }
      return
    }

    openForm(item)
  }

  const yearOptions = [...new Set([...years, ...(year !== null ? [year] : [now.getFullYear()])])].sort((a, b) => b - a)
  const summary = data?.summary

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>כספים</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchButton />
          <button type="button" onClick={() => openForm(null)} style={{ ...primaryButtonStyle, minHeight: 40 }}>
            + הוספה
          </button>
        </div>
      </div>

      <SubNav items={subItemsOf('finances', { page: 'finances', view: 'all' })} />

      {form.open && (
        <Modal
          title={form.item ? (form.item.kind === 'EXPENSE' ? 'עריכת הוצאה' : 'עריכת הכנסה') : 'הוספה חדשה'}
          onClose={closeForm}
        >
          <FinanceForm
            key={form.item?.id ?? 'new'}
            item={form.item}
            onSaved={(message) => {
              closeForm()
              setToast(message)
              load()
            }}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {toast && <Toast lines={toast} onDone={() => setToast(null)} />}

      <div style={periodBarStyle}>
        {customRange ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <label>
                <span style={mutedTextStyle}>מתאריך</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={selectStyle} />
              </label>
              <label>
                <span style={mutedTextStyle}>עד תאריך</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={selectStyle} />
              </label>
            </div>
            <div style={linksRowStyle}>
              <button type="button" onClick={() => setCustomRange(false)} style={periodLinkStyle}>
                חזרה לחודש / שנה
              </button>
              <button type="button" onClick={showThisMonth} style={periodLinkStyle}>
                חזרה לחודש הנוכחי
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={periodRowStyle}>
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={year === null}
                aria-label={month === null ? 'שנה קודמת' : 'חודש קודם'}
                title={month === null ? 'שנה קודמת' : 'חודש קודם'}
                style={arrowStyle}
              >
                ›
              </button>
              <select value={month ?? ''} onChange={(e) => pickMonth(e.target.value)} aria-label="חודש" style={{ ...periodSelectStyle, flex: 1 }}>
                <option value="">{year === null ? 'כל החודשים' : 'כל השנה'}</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
              <select value={year ?? ''} onChange={(e) => pickYear(e.target.value)} aria-label="שנה" style={{ ...periodSelectStyle, width: 104 }}>
                <option value="">כל השנים</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={year === null}
                aria-label={month === null ? 'שנה הבאה' : 'חודש הבא'}
                title={month === null ? 'שנה הבאה' : 'חודש הבא'}
                style={arrowStyle}
              >
                ‹
              </button>
            </div>
            <div style={linksRowStyle}>
              <button type="button" onClick={() => setCustomRange(true)} style={periodLinkStyle}>
                טווח תאריכים אחר
              </button>
              <button type="button" onClick={showThisMonth} style={periodLinkStyle}>
                חזרה לחודש הנוכחי
              </button>
            </div>
          </>
        )}
      </div>

      {summary && (
        <div style={summaryStyle}>
          <Figure label="הכנסות" value={formatMoney(summary.totalIncome)} color="var(--success)" />
          <span style={summaryDividerStyle} aria-hidden="true" />
          <Figure label="הוצאות" value={formatMoney(summary.totalExpenses)} color="var(--danger)" />
          <span style={summaryDividerStyle} aria-hidden="true" />
          <Figure label="רווח נקי" value={formatMoney(summary.netProfit)} color={summary.netProfit < 0 ? 'var(--danger)' : 'var(--text)'} strong />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
        <FilterTabs items={TYPE_FILTERS} value={type} onChange={setType} ariaLabel="סינון" style={{ borderBottom: 'none' }} />
        <button
          type="button"
          aria-pressed={invoice === 'missing'}
          onClick={() => setInvoice(invoice === 'missing' ? 'all' : 'missing')}
          style={{ ...tabStyle(invoice === 'missing', true), marginInlineStart: 'auto' }}
        >
          בלי חשבונית
          {summary && summary.expensesWithoutReceipt > 0 && (
            <span style={{ marginInlineStart: 6, fontSize: 13, fontWeight: 400 }}>{summary.expensesWithoutReceipt}</span>
          )}
        </button>
      </div>

      {error && <p style={errorTextStyle}>שגיאה: {error}</p>}
      {!data && !error && <SkeletonCards count={4} label="טוען" />}

      {data && data.items.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>אין תנועות בתקופה הזו</p>
          <p style={{ ...mutedTextStyle, marginBottom: 14 }}>הכנסה מופיעה כאן מהרגע שנוספה הזמנה.</p>
          <button type="button" onClick={() => openForm(null)} style={primaryButtonStyle}>
            הוספת הוצאה או הכנסה
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div style={{ paddingBottom: 90 }}>
          {groupItems(data.items, type === 'expense').map((group) => {
            const closed = group.title !== null && collapsed.has(group.title)
            return (
              <section key={group.title ?? 'all'}>
                {group.title && (
                  <h2 style={{ margin: 0 }}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.title!)}
                      aria-expanded={!closed}
                      style={{ ...groupHeadingStyle, width: 'calc(100% - 8px)', border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
                    >
                      <span>
                        {closed ? '◂' : '▾'} {group.title} · {group.items.length}
                      </span>
                      <span dir="ltr">{formatMoney(group.total)}</span>
                    </button>
                  </h2>
                )}
                {!closed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.items.map((item) => (
                      <FinanceRow key={`${item.kind}-${item.id}-${item.date}`} item={item} onOpen={() => void openRow(item)} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <button type="button" className="fab" onClick={() => openForm(null)} aria-label="הוספת הוצאה או הכנסה">
        <PlusIcon />
      </button>
    </div>
  )
}

const NO_GROUP = 'ללא קבוצה'

// The expenses view is split by her main groups, each with its own total (coming occurrences are not counted).
function groupItems(items: FinanceItem[], byGroup: boolean): { title: string | null; total: number; items: FinanceItem[] }[] {
  if (!byGroup) return [{ title: null, total: 0, items }]

  const groups = new Map<string, FinanceItem[]>()
  for (const item of items) {
    const key = item.groupName ?? NO_GROUP
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return [...groups.entries()]
    .map(([title, list]) => ({
      title,
      total: list.filter((i) => !i.isProjected).reduce((sum, i) => sum + i.amount, 0),
      items: list,
    }))
    .sort((a, b) => (a.title === NO_GROUP ? 1 : b.title === NO_GROUP ? -1 : b.total - a.total))
}

function FinanceRow({ item, onOpen }: { item: FinanceItem; onOpen: () => void }) {
  const income = item.kind === 'INCOME'
  const coming = item.isProjected

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        ...cardStyle,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: 'none',
        borderInlineStart: `4px ${coming ? 'dashed' : 'solid'} ${income ? 'var(--success)' : 'var(--danger)'}`,
        opacity: coming ? 0.65 : 1,
        textAlign: 'right',
        cursor: 'pointer',
        width: '100%',
        font: 'inherit',
        color: 'var(--text)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{item.description}</div>
        <div style={{ ...mutedTextStyle, fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
          <span>{formatOrderDate(item.date)}</span>
          {coming && <span style={{ ...smallPillStyle, background: 'var(--warning-bg)', color: 'var(--warning)' }}>צפויה</span>}
          {income && item.incomeCategory && item.incomeCategory !== 'SALES' && <span>· {INCOME_CATEGORY_LABELS[item.incomeCategory]}</span>}
          {item.supplier && <span>· {item.supplier}</span>}
          {item.groupName && <span style={{ ...smallPillStyle, background: 'var(--accent-bg)', color: 'var(--accent)' }}>{item.groupName}</span>}
          {item.typeName && <span style={{ ...smallPillStyle, background: 'var(--border)', color: 'var(--text)' }}>{item.typeName}</span>}
          {item.repeatEveryMonths && <span>↻ {item.repeatEveryMonths === 1 ? 'כל חודש' : `כל ${item.repeatEveryMonths} חודשים`}</span>}
          {item.orderId && (
            <span style={{ ...smallPillStyle, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              {income ? `מהזמנה #${item.orderNumber ?? ''} · עריכה בהזמנה ←` : `הזמנה #${item.orderNumber ?? ''}`}
            </span>
          )}
          {!income && !coming && !item.hasReceipt && <span style={{ ...smallPillStyle, background: 'var(--warning-bg)', color: 'var(--warning)' }}>אין חשבונית</span>}
          {!income && !coming && item.hasReceipt && <span style={{ ...smallPillStyle, background: 'var(--success-bg)', color: 'var(--success)' }}>חשבונית ✓</span>}
        </div>
      </div>
      <div dir="ltr" style={{ fontSize: 18, fontWeight: 700, flexShrink: 0, color: income ? 'var(--success)' : 'var(--danger)' }}>
        {income ? '+' : '-'}
        {formatMoney(item.amount)}
      </div>
    </button>
  )
}

const groupHeadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-muted)',
  margin: '16px 4px 8px',
}

const periodBarStyle: React.CSSProperties = {
  ...cardStyle,
  padding: '8px 10px',
  marginBottom: 8,
}

const periodRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

// A month or a year is picked from a list, as before, only smaller.
const periodSelectStyle: React.CSSProperties = {
  ...selectStyle,
  minHeight: 38,
  fontSize: 15,
}

const arrowStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 34,
  height: 38,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
}

const linksRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 4,
}

const periodLinkStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: '4px 2px',
  color: 'var(--accent)',
  fontSize: 12,
  cursor: 'pointer',
}

const summaryStyle: React.CSSProperties = {
  ...cardStyle,
  display: 'flex',
  alignItems: 'stretch',
  padding: '10px 4px',
  marginBottom: 8,
}

const summaryDividerStyle: React.CSSProperties = {
  width: 1,
  background: 'var(--border)',
  flexShrink: 0,
}

// One total: a small label over the number. The net profit is the heavier one.
function Figure({ label, value, color, strong }: { label: string; value: string; color: string; strong?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div dir="ltr" style={{ fontSize: strong ? 20 : 17, fontWeight: strong ? 800 : 600, color, whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

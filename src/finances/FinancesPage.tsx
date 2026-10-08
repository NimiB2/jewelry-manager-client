import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { PlusIcon } from '../icons/NavIcons'
import { formatOrderDate, monthName, periodRange } from '../orders/dates'
import { Toast } from '../orders/Toast'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { Modal } from '../shell/Modal'
import { subItemsOf } from '../shell/navItems'
import { SubNav } from '../shell/SubNav'
import { navigate } from '../shell/useRoute'
import { FinanceForm } from './FinanceForm'
import { chipStyle, selectStyle, smallPillStyle } from './styles'
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customRange, setCustomRange] = useState(false)
  const [year, setYear] = useState<number | null>(now.getFullYear())
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [type, setType] = useState<TypeFilter>('all')
  const [invoice, setInvoice] = useState<'all' | 'missing' | 'has'>('all')

  const requestCounter = useRef(0)

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
          orderNumber: e.orderNumber, hasInvoiceFile: e.invoiceFileName != null, isProjected: false, supplier: e.supplier, notes: e.notes,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'הפתיחה נכשלה')
      }
      return
    }

    openForm(item)
  }

  const yearOptions = [...new Set([...years, ...(year !== null ? [year] : [now.getFullYear()])])].sort((a, b) => b - a)
  const periodTitle = customRange
    ? 'טווח תאריכים'
    : year === null
      ? 'כל התקופות'
      : month === null
        ? `שנת ${year}`
        : `${monthName(month)} ${year}`
  const summary = data?.summary

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>כספים</h1>
        <button type="button" onClick={() => openForm(null)} style={{ ...primaryButtonStyle, minHeight: 40 }}>
          + הוספה
        </button>
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
        <div style={stepperStyle}>
          <button type="button" onClick={() => step(-1)} disabled={customRange || year === null} style={stepButtonStyle}>
            → {month === null ? 'שנה קודמת' : 'חודש קודם'}
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            title="שינוי התקופה"
            style={periodTitleStyle}
          >
            {periodTitle} {pickerOpen ? '▴' : '▾'}
          </button>
          <button type="button" onClick={() => step(1)} disabled={customRange || year === null} style={stepButtonStyle}>
            {month === null ? 'שנה הבאה' : 'חודש הבא'} ←
          </button>
        </div>

        {pickerOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button type="button" aria-pressed={!customRange} onClick={() => setCustomRange(false)} style={{ ...chipStyle(!customRange), minHeight: 32, fontSize: 14 }}>
                חודש / שנה
              </button>
              <button type="button" aria-pressed={customRange} onClick={() => setCustomRange(true)} style={{ ...chipStyle(customRange), minHeight: 32, fontSize: 14 }}>
                טווח תאריכים
              </button>
              <button type="button" onClick={showThisMonth} style={{ ...chipStyle(false), minHeight: 32, fontSize: 14, marginInlineStart: 'auto' }}>
                החודש
              </button>
            </div>

            {customRange ? (
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
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <select value={year ?? ''} onChange={(e) => pickYear(e.target.value)} aria-label="שנה" style={selectStyle}>
                  <option value="">כל השנים</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select value={month ?? ''} onChange={(e) => pickMonth(e.target.value)} aria-label="חודש" style={selectStyle}>
                  <option value="">{year === null ? 'כל החודשים' : 'כל השנה'}</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
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

      <div style={filterBarStyle} role="group" aria-label="סינון">
        {TYPE_FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={type === f.value} onClick={() => setType(f.value)} style={segmentStyle(type === f.value)}>
            {f.label}
          </button>
        ))}
        <span style={dividerStyle} aria-hidden="true" />
        <button
          type="button"
          aria-pressed={invoice === 'missing'}
          onClick={() => setInvoice(invoice === 'missing' ? 'all' : 'missing')}
          style={segmentStyle(invoice === 'missing', true)}
        >
          בלי חשבונית{summary && summary.expensesWithoutReceipt > 0 ? ` (${summary.expensesWithoutReceipt})` : ''}
        </button>
      </div>

      {error && <p style={errorTextStyle}>שגיאה: {error}</p>}
      {!data && !error && <p style={mutedTextStyle}>טוען...</p>}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 90 }}>
          {data.items.map((item) => (
            <FinanceRow key={`${item.kind}-${item.id}-${item.date}`} item={item} onOpen={() => void openRow(item)} />
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => openForm(null)} aria-label="הוספת הוצאה או הכנסה">
        <PlusIcon />
      </button>
    </div>
  )
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
          {item.typeName && <span style={{ ...smallPillStyle, background: 'var(--border)', color: 'var(--text)' }}>{item.typeName}</span>}
          {item.repeatEveryMonths && <span>↻ {item.repeatEveryMonths === 1 ? 'כל חודש' : `כל ${item.repeatEveryMonths} חודשים`}</span>}
          {item.orderId && (
            <span style={{ ...smallPillStyle, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              {income ? `מהזמנה #${item.orderNumber ?? ''} · עריכה בהזמנה ←` : `הזמנה #${item.orderNumber ?? ''}`}
            </span>
          )}
          {!income && !coming && !item.hasReceipt && <span style={{ ...smallPillStyle, background: 'var(--danger-bg)', color: 'var(--danger)' }}>אין חשבונית</span>}
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

const periodBarStyle: React.CSSProperties = {
  ...cardStyle,
  padding: '8px 10px',
  marginBottom: 8,
}

const stepperStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: 6,
}

const stepButtonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: '0 8px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const periodTitleStyle: React.CSSProperties = {
  minHeight: 36,
  border: 'none',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 16,
  fontWeight: 700,
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

// One scrollable row: type (all / income / expenses), a divider, then the missing-invoice filter.
const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: 3,
  marginBottom: 8,
  borderRadius: 11,
  background: 'var(--border)',
  overflowX: 'auto',
  scrollbarWidth: 'none',
}

const dividerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 1,
  alignSelf: 'stretch',
  margin: '4px 2px',
  background: 'var(--chevron)',
}

function segmentStyle(active: boolean, warn = false): React.CSSProperties {
  return {
    flex: '1 0 auto',
    minHeight: 34,
    padding: '0 12px',
    border: 'none',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? (warn ? 'var(--danger)' : 'var(--accent)') : 'var(--text)',
    boxShadow: active ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none',
  }
}

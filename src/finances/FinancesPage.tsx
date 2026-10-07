import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, apiJson } from '../api'
import { PlusIcon } from '../icons/NavIcons'
import { formatOrderDate, monthName, periodRange } from '../orders/dates'
import { formatMoney } from '../products/format'
import {
  cardStyle,
  errorTextStyle,
  fieldInputStyle,
  mutedTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../products/productStyles'
import { navigate } from '../shell/useRoute'
import { FinanceForm } from './FinanceForm'
import { chipStyle, selectStyle, smallPillStyle } from './styles'
import {
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  type FinanceItem,
  type FinanceList,
  type ReceiptFilter,
  type TypeFilter,
} from './types'

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'income', label: 'הכנסות' },
  { value: 'expense', label: 'הוצאות' },
]

type FormState = { open: false } | { open: true; item: FinanceItem | null }

export function FinancesPage() {
  const now = new Date()
  const [data, setData] = useState<FinanceList | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ open: false })
  const [exporting, setExporting] = useState(false)

  // The period is a year and/or month, or a free from-to range.
  const [customRange, setCustomRange] = useState(false)
  const [year, setYear] = useState<number | null>(now.getFullYear())
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [type, setType] = useState<TypeFilter>('all')
  const [receipt, setReceipt] = useState<ReceiptFilter>('all')

  const requestCounter = useRef(0)

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    const range = customRange ? { from, to } : periodRange(year, month)
    if (range?.from) params.set('from', range.from)
    if (range?.to) params.set('to', range.to)
    if (type !== 'all') params.set('type', type)
    if (receipt !== 'all') params.set('receipt', receipt)
    return params
  }, [customRange, from, to, year, month, type, receipt])

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

  // The arrows step one month at a time; they only make sense when a single month is shown.
  function shiftMonth(delta: number) {
    if (year === null || month === null) return
    const moved = new Date(year, month - 1 + delta, 1)
    setYear(moved.getFullYear())
    setMonth(moved.getMonth() + 1)
  }

  function closeForm() {
    setForm({ open: false })
  }

  function openForm(item: FinanceItem | null) {
    setForm({ open: true, item })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openRow(item: FinanceItem) {
    // Income from an order is a frozen snapshot: it is changed through the order itself.
    if (item.orderId) navigate(`/orders/${item.orderId}`)
    else openForm(item)
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const response = await apiFetch(`/finances/export?${buildQuery()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'finances.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הייצוא נכשל')
    } finally {
      setExporting(false)
    }
  }

  const yearOptions = [...new Set([...years, ...(year !== null ? [year] : [now.getFullYear()])])].sort((a, b) => b - a)
  const singleMonth = !customRange && year !== null && month !== null
  const summary = data?.summary

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>כספים</h1>
        <button type="button" onClick={() => openForm(null)} style={{ ...primaryButtonStyle, minHeight: 40 }}>
          + הוספה
        </button>
      </div>

      {form.open && (
        <FinanceForm
          key={form.item?.id ?? 'new'}
          item={form.item}
          onSaved={() => {
            closeForm()
            load()
          }}
          onCancel={closeForm}
        />
      )}

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button type="button" aria-pressed={!customRange} onClick={() => setCustomRange(false)} style={chipStyle(!customRange)}>
            חודש / שנה
          </button>
          <button type="button" aria-pressed={customRange} onClick={() => setCustomRange(true)} style={chipStyle(customRange)}>
            טווח תאריכים
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
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto auto', gap: 6, alignItems: 'center' }}>
            <button type="button" onClick={() => shiftMonth(-1)} disabled={!singleMonth} aria-label="החודש הקודם" style={arrowStyle}>
              ›
            </button>
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
            <button type="button" onClick={() => shiftMonth(1)} disabled={!singleMonth} aria-label="החודש הבא" style={arrowStyle}>
              ‹
            </button>
            <button type="button" onClick={showThisMonth} style={thisMonthStyle}>
              החודש
            </button>
          </div>
        )}
      </div>

      {summary && (
        <div style={{ ...cardStyle, textAlign: 'center', marginBottom: 12, padding: '16px 12px' }}>
          <div style={mutedTextStyle}>רווח נקי</div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: summary.netProfit < 0 ? 'var(--danger)' : 'var(--success)',
            }}
          >
            {formatMoney(summary.netProfit)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            הכנסות <b style={{ color: 'var(--success)' }}>{formatMoney(summary.totalIncome)}</b> · הוצאות{' '}
            <b style={{ color: 'var(--danger)' }}>{formatMoney(summary.totalExpenses)}</b>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={type === f.value} onClick={() => setType(f.value)} style={chipStyle(type === f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          aria-pressed={receipt === 'missing'}
          onClick={() => setReceipt(receipt === 'missing' ? 'all' : 'missing')}
          style={chipStyle(receipt === 'missing')}
        >
          בלי קבלה{summary && summary.expensesWithoutReceipt > 0 ? ` (${summary.expensesWithoutReceipt})` : ''}
        </button>
        <button
          type="button"
          aria-pressed={receipt === 'has'}
          onClick={() => setReceipt(receipt === 'has' ? 'all' : 'has')}
          style={chipStyle(receipt === 'has')}
        >
          עם קבלה
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || !data || data.items.length === 0}
          style={{ ...secondaryButtonStyle, marginInlineStart: 'auto', minHeight: 36 }}
          title="קובץ שנפתח באקסל, לפי הסינון שנבחר"
        >
          {exporting ? 'מייצא...' : 'ייצוא לקובץ'}
        </button>
      </div>

      {error && <p style={errorTextStyle}>שגיאה: {error}</p>}
      {!data && !error && <p style={mutedTextStyle}>טוען...</p>}

      {data && data.items.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>אין תנועות בתקופה הזו</p>
          <p style={{ ...mutedTextStyle, marginBottom: 14 }}>
            הכנסות מהזמנות מופיעות כאן אחרי שהזמנה מסומנת כהושלמה.
          </p>
          <button type="button" onClick={() => openForm(null)} style={primaryButtonStyle}>
            הוספת הוצאה או הכנסה
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 90 }}>
          {data.items.map((item) => (
            <FinanceRow key={`${item.kind}-${item.id}`} item={item} onOpen={() => openRow(item)} />
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
  const category = income
    ? INCOME_CATEGORY_LABELS[item.incomeCategory ?? 'OTHER']
    : EXPENSE_CATEGORY_LABELS[item.expenseCategory ?? 'VARIABLE']

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
        border: 'none',
        borderInlineStart: `4px solid ${income ? 'var(--success)' : 'var(--danger)'}`,
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
          <span>
            {formatOrderDate(item.date)} · {category}
          </span>
          {item.repeatEveryMonths && <span>↻ כל {item.repeatEveryMonths === 1 ? 'חודש' : `${item.repeatEveryMonths} חודשים`}</span>}
          {item.orderId && <span style={{ ...smallPillStyle, background: 'var(--accent-bg)', color: 'var(--accent)' }}>מהזמנה</span>}
          {!income && (
            <span
              style={{
                ...smallPillStyle,
                background: item.hasReceipt ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: item.hasReceipt ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {item.hasReceipt ? 'יש קבלה' : 'אין קבלה'}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, flexShrink: 0, color: income ? 'var(--success)' : 'var(--danger)' }}>
        {income ? '+' : '-'}
        {formatMoney(item.amount)}
      </div>
    </button>
  )
}

const arrowStyle: React.CSSProperties = {
  ...fieldInputStyle,
  width: 40,
  minHeight: 40,
  padding: 0,
  textAlign: 'center',
  fontSize: 20,
  cursor: 'pointer',
}

const thisMonthStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

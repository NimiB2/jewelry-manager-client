import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { formatOrderDate } from '../orders/dates'
import { Toast } from '../orders/Toast'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { Modal } from '../shell/Modal'
import { subItemsOf } from '../shell/navItems'
import { SubNav } from '../shell/SubNav'
import { InvoiceSection } from './InvoiceSection'
import { attachInvoice, downloadFile } from './invoiceApi'
import { chipStyle, smallPillStyle } from './styles'
import type { FinanceItem, FinanceList } from './types'

type Preset = 'last2' | 'month' | 'year' | 'lastYear' | 'custom'
type Filter = 'all' | 'missing' | 'has'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'last2', label: 'חודשיים אחרונים' },
  { value: 'month', label: 'החודש' },
  { value: 'year', label: 'השנה' },
  { value: 'lastYear', label: 'שנה שעברה' },
  { value: 'custom', label: 'טווח אחר' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const lastDayOf = (y: number, m: number) => new Date(y, m, 0).getDate()

// "2026-09" -> the first / last day of that month.
const monthStart = (value: string) => `${value}-01`
const monthEnd = (value: string) => {
  const [y, m] = value.split('-').map(Number)
  return iso(y, m, lastDayOf(y, m))
}

function rangeFor(preset: Preset, fromMonth: string, toMonth: string): { from: string; to: string } | null {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  switch (preset) {
    case 'month':
      return { from: iso(y, m, 1), to: iso(y, m, lastDayOf(y, m)) }
    case 'last2': {
      const previous = new Date(y, m - 2, 1)
      return { from: iso(previous.getFullYear(), previous.getMonth() + 1, 1), to: iso(y, m, lastDayOf(y, m)) }
    }
    case 'year':
      return { from: iso(y, 1, 1), to: iso(y, 12, 31) }
    case 'lastYear':
      return { from: iso(y - 1, 1, 1), to: iso(y - 1, 12, 31) }
    case 'custom':
      return fromMonth && toMonth ? { from: monthStart(fromMonth), to: monthEnd(toMonth) } : null
  }
}

// Everything about invoices in one place: which expenses have one, attaching it, and sending a
// whole period to the accountant as a single ZIP.
export function InvoicesPage() {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

  const [preset, setPreset] = useState<Preset>('last2')
  const [fromMonth, setFromMonth] = useState(thisMonth)
  const [toMonth, setToMonth] = useState(thisMonth)
  const [filter, setFilter] = useState<Filter>('all')

  const [data, setData] = useState<FinanceList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FinanceItem | null>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string[] | null>(null)
  const requestCounter = useRef(0)

  const range = rangeFor(preset, fromMonth, toMonth)

  const load = useCallback(() => {
    if (!range) return
    const requestId = ++requestCounter.current
    const params = new URLSearchParams({ type: 'expense', from: range.from, to: range.to })

    apiJson<FinanceList>(`/finances?${params}`)
      .then((list) => {
        if (requestId !== requestCounter.current) return
        setData(list)
        setError(null)
      })
      .catch((err) => {
        if (requestId === requestCounter.current) setError(err instanceof Error ? err.message : String(err))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to])

  useEffect(load, [load])

  async function exportZip() {
    if (!range) return
    setExporting(true)
    setError(null)
    try {
      await downloadFile(`/invoices/export?from=${range.from}&to=${range.to}`, `invoices-${range.from}_${range.to}.zip`)
      setToast(['הקובץ ירד למכשיר', 'בפנים: כל החשבוניות ורשימת ההוצאות'])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הייצוא נכשל')
    } finally {
      setExporting(false)
    }
  }

  const expenses = data?.items ?? []
  const withFile = expenses.filter((e) => e.hasInvoiceFile).length
  const missing = expenses.length - withFile
  const visible = expenses.filter((e) => (filter === 'missing' ? !e.hasInvoiceFile : filter === 'has' ? e.hasInvoiceFile : true))

  return (
    <div className="screen">
      <h1 style={{ margin: '0 0 8px' }}>חשבוניות</h1>
      <SubNav items={subItemsOf('finances', { page: 'finances', view: 'invoices' })} />

      <div style={{ ...cardStyle, marginBottom: 8, padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={preset === p.value}
              onClick={() => setPreset(p.value)}
              style={{ ...chipStyle(preset === p.value), flex: '0 0 auto', minHeight: 34, fontSize: 14 }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <label>
              <span style={mutedTextStyle}>מחודש</span>
              <input type="month" value={fromMonth} max={toMonth} onChange={(e) => setFromMonth(e.target.value)} style={{ ...fieldInputStyle, minHeight: 40 }} />
            </label>
            <label>
              <span style={mutedTextStyle}>עד חודש</span>
              <input type="month" value={toMonth} min={fromMonth} onChange={(e) => setToMonth(e.target.value)} style={{ ...fieldInputStyle, minHeight: 40 }} />
            </label>
          </div>
        )}

        {range && (
          <p style={{ ...mutedTextStyle, margin: '8px 0 0', fontSize: 13 }}>
            {formatOrderDate(range.from)} עד {formatOrderDate(range.to)}
          </p>
        )}
      </div>

      <div style={{ ...cardStyle, marginBottom: 8, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            <div>
              <b>{withFile}</b> חשבוניות מצורפות
            </div>
            <div style={{ color: missing > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {missing > 0 ? <b>{missing}</b> : 'אין'} הוצאות בלי חשבונית
            </div>
          </div>
          <button
            type="button"
            onClick={exportZip}
            disabled={exporting || !range || withFile === 0}
            style={{ ...primaryButtonStyle, minHeight: 44, opacity: withFile === 0 ? 0.5 : 1 }}
            title={withFile === 0 ? 'אין חשבוניות מצורפות בתקופה הזו' : 'כל החשבוניות של התקופה בקובץ אחד'}
          >
            {exporting ? 'מכין קובץ...' : 'ייצוא ZIP'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(
          [
            ['all', 'כל ההוצאות'],
            ['missing', `חסרות חשבונית${missing > 0 ? ` (${missing})` : ''}`],
            ['has', 'עם חשבונית'],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} style={{ ...chipStyle(filter === value), minHeight: 34, fontSize: 14, minWidth: 0, padding: '0 12px' }}>
            {label}
          </button>
        ))}
      </div>

      {error && <p style={errorTextStyle}>שגיאה: {error}</p>}
      {!data && !error && range && <p style={mutedTextStyle}>טוען...</p>}
      {!range && <p style={mutedTextStyle}>בחרי חודש התחלה וחודש סיום.</p>}

      {data && visible.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '24px 16px' }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            {filter === 'missing' ? 'לכל ההוצאות בתקופה יש חשבונית' : 'אין הוצאות בתקופה הזו'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 90 }}>
        {visible.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item)} style={rowStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{item.description}</div>
              <div style={{ ...mutedTextStyle, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                <span>{formatOrderDate(item.date)}</span>
                {item.hasInvoiceFile ? (
                  <span style={{ ...smallPillStyle, background: 'var(--success-bg)', color: 'var(--success)' }}>חשבונית מצורפת</span>
                ) : (
                  <span style={{ ...smallPillStyle, background: 'var(--danger-bg)', color: 'var(--danger)' }}>אין חשבונית</span>
                )}
              </div>
            </div>
            <div dir="ltr" style={{ fontSize: 17, fontWeight: 700, flexShrink: 0, color: 'var(--danger)' }}>
              -{formatMoney(item.amount)}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <Modal title="חשבונית להוצאה" onClose={() => setSelected(null)}>
          <InvoiceDialog
            item={selected}
            onChanged={(updated) => {
              setSelected(updated)
              load()
            }}
            onClose={() => setSelected(null)}
          />
        </Modal>
      )}

      {toast && <Toast lines={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

type InvoiceDialogProps = {
  item: FinanceItem
  onChanged: (updated: FinanceItem) => void
  onClose: () => void
}

// Just the invoice of one expense: attach (it uploads at once), view, replace, remove.
function InvoiceDialog({ item, onChanged, onClose }: InvoiceDialogProps) {
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File | null) {
    if (!file) return
    setError(null)
    try {
      await attachInvoice(item.id, file)
      onChanged({ ...item, hasInvoiceFile: true, hasReceipt: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הצירוף נכשל')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{item.description}</div>
        <div style={{ ...mutedTextStyle, fontSize: 13 }}>
          {formatOrderDate(item.date)} · {formatMoney(item.amount)}
        </div>
      </div>

      <InvoiceSection
        expenseId={item.id}
        hasFile={item.hasInvoiceFile}
        pendingFile={null}
        onPick={(file) => void upload(file)}
        onRemoved={() => onChanged({ ...item, hasInvoiceFile: false, hasReceipt: false })}
        prominent
      />

      {error && <p style={{ ...errorTextStyle, margin: '8px 0' }}>{error}</p>}

      <button type="button" onClick={onClose} style={{ ...primaryButtonStyle, width: '100%', marginTop: 8 }}>
        סיום
      </button>
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  ...cardStyle,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  border: 'none',
  textAlign: 'right',
  cursor: 'pointer',
  width: '100%',
  font: 'inherit',
  color: 'var(--text)',
}

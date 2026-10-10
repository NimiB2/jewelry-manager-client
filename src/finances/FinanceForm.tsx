import { useEffect, useState, type ReactNode } from 'react'
import { apiJson } from '../api'
import { ConfirmInline } from '../orders/ConfirmInline'
import { formatOrderDate, todayIso } from '../orders/dates'
import type { OrdersList } from '../orders/types'
import { errorTextStyle, fieldInputStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import { InvoiceSection } from './InvoiceSection'
import { attachInvoice, isInvoiceReaderAvailable, readInvoice } from './invoiceApi'
import {
  INCOME_CATEGORY_LABELS,
  type FinanceItem,
  type FinanceKind,
  type IncomeCategory,
  type OrderOption,
} from './types'

type FinanceFormProps = {
  // Null = a new record; otherwise the row being edited.
  item: FinanceItem | null
  // Gets the lines to show in the confirmation toast.
  onSaved: (message: string[]) => void
  onCancel: () => void
}

type SavedExpense = { id: string }

// What a delete removes: this one, this and the coming ones, or only the coming ones (stop the repeat).
type DeleteScope = 'This' | 'FromHere' | 'After'

// How often a new expense repeats. "once" is the default, so not repeating is the plain state.
type Repeat = 'once' | '1' | '2' | '3' | 'other'

const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: 'once', label: 'חד פעמית' },
  { value: '1', label: 'כל חודש' },
  { value: '2', label: 'כל חודשיים' },
  { value: '3', label: 'כל 3 חודשים' },
  { value: 'other', label: 'אחר...' },
]

// A compact form: the invoice first, then the amount, a one-line category strip, the name over the
// supplier over a note, and the order and repeat as two small fields.
export function FinanceForm({ item, onSaved, onCancel }: FinanceFormProps) {
  const editing = item !== null
  const [kind, setKind] = useState<FinanceKind>(item?.kind ?? 'EXPENSE')
  const [date, setDate] = useState(item?.date ?? todayIso())
  const [description, setDescription] = useState(item?.description ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>(item?.incomeCategory ?? 'OTHER')

  // Expense only.
  const [repeat, setRepeat] = useState<Repeat>('once')
  const [every, setEvery] = useState('4')
  const [typeName, setTypeName] = useState(item?.typeName ?? '')
  const [supplier, setSupplier] = useState(item?.supplier ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [showNotes, setShowNotes] = useState(Boolean(item?.notes))
  const [orderId, setOrderId] = useState(item?.orderId ?? '')
  const [hasFile, setHasFile] = useState(item?.hasInvoiceFile ?? false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [readerAvailable, setReaderAvailable] = useState(false)
  const [readNote, setReadNote] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [applyToSeries, setApplyToSeries] = useState(false)

  const [expenseTypes, setExpenseTypes] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [orders, setOrders] = useState<OrderOption[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExpense = kind === 'EXPENSE'
  const inSeries = item?.seriesId != null
  const repeatMonths =
    repeat === 'once' ? null : repeat === 'other' ? Math.min(24, Math.max(1, Math.round(Number(every)) || 1)) : Number(repeat)

  useEffect(() => {
    apiJson<{ data: { expenseTypes?: string[] } }>('/settings')
      .then((s) => setExpenseTypes(s.data.expenseTypes ?? []))
      .catch(() => setExpenseTypes([]))
    apiJson<string[]>('/expenses/suppliers').then(setSuppliers).catch(() => setSuppliers([]))
    isInvoiceReaderAvailable().then(setReaderAvailable).catch(() => setReaderAvailable(false))
    apiJson<OrdersList>('/orders?status=all')
      .then((list) =>
        setOrders(
          list.orders.map((o) => ({
            id: o.id,
            label: `#${o.number} · ${o.customer ?? 'ללא שם'} · ${formatOrderDate(o.date)}`,
          })),
        ),
      )
      .catch(() => setOrders([]))
  }, [])

  // The invoice is the first thing she adds. When a reader is connected it fills the form from the
  // invoice; whatever she already typed is kept, and she can change everything before saving.
  async function pickInvoice(file: File | null) {
    setPendingFile(file)
    setReadNote(null)
    if (!file || !readerAvailable || editing) return

    setReadNote(null)
    setReading(true)
    try {
      const found = await readInvoice(file)
      if (!found) return setReadNote('לא הצלחתי לקרוא את החשבונית, אפשר למלא ידנית.')

      if (found.amount !== null) setAmount((current) => (current.trim() === '' ? String(found.amount) : current))
      if (found.date) setDate(found.date)
      if (found.supplier) setSupplier((current) => (current.trim() === '' ? found.supplier! : current))
      if (found.description) setDescription((current) => (current.trim() === '' ? found.description! : current))
      if (found.typeName) setTypeName((current) => (current === '' ? found.typeName! : current))
      setReadNote('הפרטים מולאו מהחשבונית. כדאי לבדוק לפני שמירה.')
    } catch {
      setReadNote('הקריאה האוטומטית לא זמינה כרגע, אפשר למלא ידנית.')
    } finally {
      setReading(false)
    }
  }

  async function saveExpense(value: number, text: string) {
    const body = {
      date,
      category: editing ? item.expenseCategory : repeatMonths ? 'FIXED' : 'VARIABLE',
      description: text,
      amount: value,
      typeName: typeName || null,
      supplier: supplier.trim() || null,
      notes: notes.trim() || null,
      // A recurring expense repeats the money, not an order.
      orderId: repeatMonths || inSeries ? null : orderId || null,
    }

    const saved = editing
      ? await apiJson<SavedExpense>(`/expenses/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...body, applyToSeries }) })
      : await apiJson<SavedExpense>('/expenses', { method: 'POST', body: JSON.stringify({ ...body, repeatEveryMonths: repeatMonths }) })

    const message = savedMessage()
    if (!pendingFile) return message

    // The expense is saved; a failed upload must not look like a failed save.
    try {
      await attachInvoice(saved.id, pendingFile)
    } catch {
      return [...message, 'צירוף החשבונית נכשל. אפשר לנסות שוב מעריכת ההוצאה']
    }
    return message
  }

  async function submit(action: () => Promise<string[]>) {
    setBusy(true)
    setError(null)
    try {
      onSaved(await action())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
      setBusy(false)
    }
  }

  function save() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('צריך להזין סכום')
    if (!date) return setError('צריך לבחור תאריך')

    // The name is optional: the category stands in for it.
    const text = description.trim() || (isExpense ? typeName : INCOME_CATEGORY_LABELS[incomeCategory])
    if (!text) return setError('בחרי קטגוריה או כתבי שם')

    if (isExpense) {
      void submit(() => saveExpense(value, text))
    } else {
      const body = { date, category: incomeCategory, description: text, amount: value }
      void submit(async () => {
        await apiJson(editing ? `/incomes/${item.id}` : '/incomes', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) })
        return ['ההכנסה נשמרה']
      })
    }
  }

  // Saving a recurring expense says so, with the date it comes back.
  function savedMessage(): string[] {
    if (!editing && repeatMonths) {
      return [
        'ההוצאה נשמרה',
        `תחזור אוטומטית ${repeatMonths === 1 ? 'כל חודש' : `כל ${repeatMonths} חודשים`}, הפעם הבאה ב-${formatOrderDate(addMonths(date, repeatMonths))}`,
      ]
    }
    return ['ההוצאה נשמרה']
  }

  function remove(scope: DeleteScope) {
    if (!item) return
    void submit(async () => {
      await apiJson(isExpense ? `/expenses/${item.id}?scope=${scope}` : `/incomes/${item.id}`, { method: 'DELETE' })
      if (scope === 'After') return ['החזרה הופסקה. ההוצאות שעד כאן נשארו']
      if (scope === 'FromHere') return ['ההוצאה והחזרות שאחריה נמחקו']
      return [isExpense ? 'ההוצאה נמחקה' : 'ההכנסה נמחקה']
    })
  }

  const incomeCategories = Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[]
  const showOrderPicker = isExpense && !repeatMonths && !inSeries
  const showRepeatPicker = isExpense && !editing

  // The categories, as plain words on one line that scrolls sideways.
  const strip: { key: string; label: string; active: boolean; pick: () => void }[] = isExpense
    ? [
        ...expenseTypes.map((t) => ({ key: t, label: t, active: typeName === t, pick: () => setTypeName(typeName === t ? '' : t) })),
        // A category that was removed from the settings still shows on the expense that has it.
        ...(typeName && !expenseTypes.includes(typeName) ? [{ key: typeName, label: typeName, active: true, pick: () => setTypeName('') }] : []),
      ]
    : incomeCategories.map((c) => ({ key: c, label: INCOME_CATEGORY_LABELS[c], active: incomeCategory === c, pick: () => setIncomeCategory(c) }))

  return (
    <div>
      {!editing && (
        <div style={segmentBarStyle}>
          <button type="button" aria-pressed={isExpense} onClick={() => setKind('EXPENSE')} style={segmentStyle(isExpense)}>
            הוצאה
          </button>
          <button type="button" aria-pressed={!isExpense} onClick={() => setKind('INCOME')} style={segmentStyle(!isExpense)}>
            הכנסה
          </button>
        </div>
      )}

      {isExpense && (
        <div style={{ marginTop: 10 }}>
          <InvoiceSection
            expenseId={item?.id ?? null}
            hasFile={hasFile}
            pendingFile={pendingFile}
            onPick={(file) => void pickInvoice(file)}
            onRemoved={() => setHasFile(false)}
            slim
            note={readNote}
            reading={reading}
            title={readerAvailable ? 'צלמי או העלי חשבונית, הפרטים ימולאו לבד' : 'הוספת חשבונית'}
            subtitle={readerAvailable ? '' : 'תמונה או PDF'}
          />
        </div>
      )}

      {/* The amount is the one thing she always fills in by hand, so it is the big field. */}
      <div style={amountBoxStyle}>
        <label style={{ flex: 1, minWidth: 0 }}>
          <span style={tinyLabelStyle}>סכום</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="₪ 0"
            aria-label="סכום"
            autoFocus
            style={amountInputStyle}
          />
        </label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="תאריך" style={dateStyle} />
      </div>

      {strip.length > 0 ? (
        <div style={stripStyle} role="group" aria-label="קטגוריה">
          {strip.map((c) => (
            <button key={c.key} type="button" aria-pressed={c.active} onClick={c.pick} style={stripItemStyle(c.active)}>
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        isExpense && <p style={hintStyle}>אפשר להגדיר קטגוריות הוצאה (חומרים, אריזה, שיווק) בהגדרות האישיות.</p>
      )}

      {/* Name, supplier and a note: one under the other, each smaller than the one above it. */}
      <div style={detailsStyle}>
        <div style={detailRowStyle}>
          <span style={detailLabelStyle}>שם</span>
          <input
            type="text"
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="שם / תיאור"
            aria-label="שם או תיאור"
            style={{ ...bareInputStyle, fontSize: 17, fontWeight: 600 }}
          />
        </div>

        {isExpense && (
          <>
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>ספק</span>
              <input
                type="text"
                list="finance-suppliers"
                value={supplier}
                maxLength={100}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="בחרי או הקלידי"
                aria-label="ספק"
                style={{ ...bareInputStyle, fontSize: 14 }}
              />
              <datalist id="finance-suppliers">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {showNotes ? (
              <div style={{ ...detailRowStyle, alignItems: 'flex-start', borderBottom: 'none' }}>
                <span style={{ ...detailLabelStyle, paddingTop: 8 }}>הערה</span>
                <textarea
                  value={notes}
                  maxLength={1000}
                  rows={2}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערה חופשית"
                  aria-label="הערה"
                  style={{ ...bareInputStyle, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', minHeight: 48, padding: '8px 0' }}
                />
              </div>
            ) : (
              <button type="button" onClick={() => setShowNotes(true)} style={addNoteStyle}>
                + הערה
              </button>
            )}
          </>
        )}
      </div>

      {isExpense && (showOrderPicker || showRepeatPicker || (editing && inSeries)) && (
        <div style={{ display: 'grid', gridTemplateColumns: showOrderPicker && (showRepeatPicker || inSeries) ? '1fr 1fr' : '1fr', gap: 8, marginTop: 10 }}>
          {showOrderPicker && (
            <SmallField label="הזמנה">
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} aria-label="הזמנה" style={bareSelectStyle}>
                <option value="">ללא</option>
                {item?.orderId && !orders.some((o) => o.id === item.orderId) && <option value={item.orderId}>#{item.orderNumber}</option>}
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </SmallField>
          )}

          {showRepeatPicker && (
            <SmallField label="חזרה">
              <select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} aria-label="חזרה" style={bareSelectStyle}>
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </SmallField>
          )}

          {editing && inSeries && (
            <SmallField label="חזרה">
              <span style={{ fontSize: 14 }}>↻ {item?.repeatEveryMonths === 1 ? 'כל חודש' : `כל ${item?.repeatEveryMonths} חודשים`}</span>
            </SmallField>
          )}
        </div>
      )}

      {showRepeatPicker && repeat === 'other' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 8 }}>
          חוזרת כל
          <input
            type="number"
            min="1"
            max="24"
            inputMode="numeric"
            value={every}
            onChange={(e) => setEvery(e.target.value)}
            aria-label="כל כמה חודשים"
            style={{ ...fieldInputStyle, width: 64, minHeight: 36, padding: '2px 8px', fontSize: 14, textAlign: 'center' }}
          />
          חודשים
        </label>
      )}

      {isExpense && editing && inSeries && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 8 }}>
          <input type="checkbox" checked={applyToSeries} onChange={(e) => setApplyToSeries(e.target.checked)} />
          עדכון גם לחודשים הבאים
        </label>
      )}

      {error && <p style={{ ...errorTextStyle, margin: '8px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={save} disabled={busy} style={{ ...primaryButtonStyle, flex: 1, minHeight: 48 }}>
          {busy ? 'שומר...' : 'שמירה'}
        </button>
        {!editing && (
          <button type="button" onClick={onCancel} disabled={busy} style={secondaryButtonStyle}>
            ביטול
          </button>
        )}
      </div>

      {/* Deleting sits right under Save, in plain view, and always asks first. */}
      {editing && !confirmingDelete && (
        <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy} style={deleteButtonStyle}>
          {inSeries ? 'עצירת חזרה או מחיקה' : isExpense ? 'מחיקת ההוצאה' : 'מחיקת ההכנסה'}
        </button>
      )}

      {confirmingDelete && (
        <div style={{ marginTop: 10 }}>
          {inSeries && isExpense ? (
            <div role="alertdialog" aria-label="הוצאה קבועה" style={deleteBoxStyle}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>זו הוצאה שחוזרת. מה לעשות?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" disabled={busy} onClick={() => remove('After')} style={secondaryButtonStyle}>
                  להפסיק את החזרה (ההוצאות שעד כאן נשארות)
                </button>
                <button type="button" disabled={busy} onClick={() => remove('This')} style={secondaryButtonStyle}>
                  למחוק רק את ההוצאה הזו
                </button>
                <button type="button" disabled={busy} onClick={() => remove('FromHere')} style={{ ...secondaryButtonStyle, color: 'var(--danger)' }}>
                  למחוק אותה ואת כל הבאות
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirmingDelete(false)} style={secondaryButtonStyle}>
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <ConfirmInline
              message={isExpense ? 'למחוק את ההוצאה?' : 'למחוק את ההכנסה?'}
              confirmLabel="כן, למחוק"
              busy={busy}
              onConfirm={() => remove('This')}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// A small boxed field with its label inside, for the order and repeat choices.
function SmallField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={smallFieldStyle}>
      <span style={tinyLabelStyle}>{label}</span>
      {children}
    </div>
  )
}

const hintStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 12,
  color: 'var(--text-muted)',
}

const tinyLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-muted)',
}

const amountBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 10,
  padding: '8px 14px',
  border: '1px solid var(--border)',
  borderRadius: 12,
  background: 'var(--surface)',
}

const amountInputStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 28,
  fontWeight: 600,
  padding: 0,
  textAlign: 'right',
}

const dateStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 16,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 13,
  padding: '6px 10px',
  minHeight: 32,
}

// The categories: no boxes, no lines, just words; the chosen one is blue and bold. Scrolls sideways.
const stripStyle: React.CSSProperties = {
  display: 'flex',
  gap: 18,
  overflowX: 'auto',
  scrollbarWidth: 'thin',
  marginTop: 6,
  padding: '4px 2px 6px',
  whiteSpace: 'nowrap',
}

function stripItemStyle(active: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto',
    border: 'none',
    background: 'transparent',
    padding: '4px 0',
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer',
  }
}

const detailsStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '0 12px',
  borderRadius: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
}

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  borderBottom: '1px solid var(--border)',
}

const detailLabelStyle: React.CSSProperties = {
  width: 34,
  flexShrink: 0,
  fontSize: 12,
  color: 'var(--text-muted)',
}

const bareInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 44,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--text)',
  textAlign: 'right',
}

const addNoteStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 13,
  padding: '10px 0',
  cursor: 'pointer',
}

const smallFieldStyle: React.CSSProperties = {
  minWidth: 0,
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
}

const bareSelectStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 14,
  padding: '2px 0',
}

const deleteButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  marginTop: 10,
  border: '1px solid var(--danger)',
  borderRadius: 10,
  background: 'transparent',
  color: 'var(--danger)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

const deleteBoxStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  background: 'var(--warning-bg)',
}

const segmentBarStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: 2,
  padding: 2,
  borderRadius: 8,
  background: 'var(--border)',
}

function segmentStyle(active: boolean): React.CSSProperties {
  return {
    border: 'none',
    borderRadius: 6,
    padding: '5px 16px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    boxShadow: active ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none',
  }
}

// Same day of the month, N months on; a short month takes its last day.
function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const first = new Date(y, m - 1 + months, 1)
  const day = Math.min(d, new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate())
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(day)}`
}

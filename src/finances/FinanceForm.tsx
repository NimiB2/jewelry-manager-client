import { useState } from 'react'
import { apiJson } from '../api'
import { todayIso } from '../orders/dates'
import { ConfirmInline } from '../orders/ConfirmInline'
import {
  cardStyle,
  errorTextStyle,
  fieldInputStyle,
  fieldLabelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../products/productStyles'
import { chipStyle } from './styles'
import {
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  type ExpenseCategory,
  type FinanceItem,
  type FinanceKind,
  type IncomeCategory,
} from './types'

type FinanceFormProps = {
  // Null = a new record; otherwise the row being edited.
  item: FinanceItem | null
  onSaved: () => void
  onCancel: () => void
}

// One form for both kinds. A new record picks expense or income first; an existing one keeps its kind.
export function FinanceForm({ item, onSaved, onCancel }: FinanceFormProps) {
  const editing = item !== null
  const [kind, setKind] = useState<FinanceKind>(item?.kind ?? 'EXPENSE')
  const [date, setDate] = useState(item?.date ?? todayIso())
  const [description, setDescription] = useState(item?.description ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>(item?.expenseCategory ?? 'VARIABLE')
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>(item?.incomeCategory ?? 'OTHER')
  const [hasReceipt, setHasReceipt] = useState(item?.hasReceipt ?? false)
  const [repeat, setRepeat] = useState(false)
  const [every, setEvery] = useState('1')
  const [applyToSeries, setApplyToSeries] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExpense = kind === 'EXPENSE'
  const inSeries = item?.seriesId != null

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
      setBusy(false)
    }
  }

  function save() {
    const value = Number(amount)
    if (!description.trim()) return setError('צריך להוסיף תיאור')
    if (!Number.isFinite(value) || value <= 0) return setError('צריך להזין סכום גדול מאפס')
    if (!date) return setError('צריך לבחור תאריך')

    if (isExpense) {
      const body = { date, category: expenseCategory, description: description.trim(), amount: value, hasReceipt }
      void run(() =>
        editing
          ? apiJson(`/expenses/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...body, applyToSeries }) })
          : apiJson('/expenses', {
              method: 'POST',
              body: JSON.stringify({ ...body, repeatEveryMonths: repeat ? Number(every) || 1 : null }),
            }),
      )
    } else {
      const body = { date, category: incomeCategory, description: description.trim(), amount: value }
      void run(() =>
        apiJson(editing ? `/incomes/${item.id}` : '/incomes', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) }),
      )
    }
  }

  function remove(wholeSeries: boolean) {
    if (!item) return
    void run(() =>
      apiJson(isExpense ? `/expenses/${item.id}?wholeSeries=${wholeSeries}` : `/incomes/${item.id}`, { method: 'DELETE' }),
    )
  }

  return (
    <div style={{ ...cardStyle, marginBottom: 12 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>
        {editing ? (isExpense ? 'עריכת הוצאה' : 'עריכת הכנסה') : isExpense ? 'הוצאה חדשה' : 'הכנסה חדשה'}
      </h2>

      {!editing && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" aria-pressed={isExpense} onClick={() => setKind('EXPENSE')} style={chipStyle(isExpense)}>
            הוצאה
          </button>
          <button type="button" aria-pressed={!isExpense} onClick={() => setKind('INCOME')} style={chipStyle(!isExpense)}>
            הכנסה
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label>
          <span style={fieldLabelStyle}>סכום (₪)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={fieldInputStyle}
            autoFocus
          />
        </label>
        <label>
          <span style={fieldLabelStyle}>תאריך</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldInputStyle} />
        </label>
      </div>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={fieldLabelStyle}>תיאור</span>
        <input
          type="text"
          value={description}
          maxLength={300}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isExpense ? 'למשל: חומרי גלם, שכירות' : 'למשל: שיעור, מכירה בשוק'}
          style={fieldInputStyle}
        />
      </label>

      <div style={{ marginBottom: 8 }}>
        <span style={fieldLabelStyle}>סוג</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isExpense
            ? (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
                <button key={c} type="button" aria-pressed={expenseCategory === c} onClick={() => setExpenseCategory(c)} style={chipStyle(expenseCategory === c)}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </button>
              ))
            : (Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[]).map((c) => (
                <button key={c} type="button" aria-pressed={incomeCategory === c} onClick={() => setIncomeCategory(c)} style={chipStyle(incomeCategory === c)}>
                  {INCOME_CATEGORY_LABELS[c]}
                </button>
              ))}
        </div>
      </div>

      {isExpense && (
        <>
          <label style={checkRowStyle}>
            <input type="checkbox" checked={hasReceipt} onChange={(e) => setHasReceipt(e.target.checked)} />
            יש קבלה להוצאה הזו
          </label>

          {!editing && (
            <div style={{ marginBottom: 8 }}>
              <label style={checkRowStyle}>
                <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
                הוצאה חוזרת
              </label>
              {repeat && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                  כל
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={every}
                    onChange={(e) => setEvery(e.target.value)}
                    style={{ ...fieldInputStyle, width: 72, minHeight: 40 }}
                  />
                  חודשים
                </label>
              )}
            </div>
          )}

          {editing && inSeries && (
            <label style={checkRowStyle}>
              <input type="checkbox" checked={applyToSeries} onChange={(e) => setApplyToSeries(e.target.checked)} />
              עדכון גם לחודשים הבאים של הוצאה חוזרת זו (כל {item?.repeatEveryMonths ?? 1} חודשים)
            </label>
          )}
        </>
      )}

      {error && <p style={{ ...errorTextStyle, margin: '8px 0' }}>{error}</p>}

      {confirmingDelete && (
        <div style={{ marginBottom: 8 }}>
          {inSeries && isExpense ? (
            <div role="alertdialog" aria-label="מחיקת הוצאה חוזרת" style={deleteBoxStyle}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>זו הוצאה חוזרת. מה למחוק?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" disabled={busy} onClick={() => remove(false)} style={secondaryButtonStyle}>
                  רק את ההוצאה הזו
                </button>
                <button type="button" disabled={busy} onClick={() => remove(true)} style={{ ...secondaryButtonStyle, color: 'var(--danger)' }}>
                  אותה ואת כל הבאות (עוצר את החזרה)
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
              onConfirm={() => remove(false)}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={save} disabled={busy} style={{ ...primaryButtonStyle, flex: 1 }}>
          {busy ? 'שומר...' : 'שמירה'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={secondaryButtonStyle}>
          ביטול
        </button>
        {editing && !confirmingDelete && (
          <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy} style={{ ...secondaryButtonStyle, color: 'var(--danger)' }}>
            מחיקה
          </button>
        )}
      </div>
    </div>
  )
}

const checkRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 40,
  fontSize: 15,
}

const deleteBoxStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  background: 'var(--warning-bg)',
}

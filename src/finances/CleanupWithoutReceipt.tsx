import { useState } from 'react'
import { apiJson } from '../api'
import { formatOrderDate } from '../orders/dates'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, linkButtonStyle, mutedTextStyle, secondaryButtonStyle } from '../products/productStyles'

type Item = {
  id: string
  date: string
  description: string
  supplier: string | null
  typeName: string | null
  amount: number
  isRecurring: boolean
  linkedToOrder: boolean
  fromStatement: boolean
}

type Preview = { items: Item[]; total: number }

type Scope = 'all' | 'period'

type Props = {
  // The period chosen on the page, or null when none is selected.
  range: { from: string; to: string } | null
  onDeleted: () => void
}

// Deletes the expenses that have no invoice, after showing exactly which ones. The list is saved to a
// file first, so a mistake can be put right from it.
export function CleanupWithoutReceipt({ range, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<Scope>('all')
  const [includeRecurring, setIncludeRecurring] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const query = () => {
    const params = new URLSearchParams({ includeRecurring: String(includeRecurring) })
    if (scope === 'period' && range) {
      params.set('from', range.from)
      params.set('to', range.to)
    }
    return params
  }

  async function show() {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      setPreview(await apiJson<Preview>(`/expenses/without-receipt?${query()}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הטעינה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!preview || preview.items.length === 0) return
    const orderLinked = preview.items.filter((i) => i.linkedToOrder).length
    const warning = orderLinked > 0 ? `\n${orderLinked} מהן מקושרות להזמנות, והרווח של ההזמנות האלה ישתנה.` : ''
    const sure = window.confirm(
      `למחוק ${preview.items.length} הוצאות בסך ${formatMoney(preview.total)}?${warning}\nאי אפשר לבטל. הרשימה תורד לקובץ לפני המחיקה.`,
    )
    if (!sure) return

    setBusy(true)
    setError(null)
    try {
      downloadCsv(preview.items)
      const body = {
        from: scope === 'period' && range ? range.from : null,
        to: scope === 'period' && range ? range.to : null,
        includeRecurring,
        expectedCount: preview.items.length,
      }
      const { deleted } = await apiJson<{ deleted: number }>('/expenses/without-receipt/delete', { method: 'POST', body: JSON.stringify(body) })
      setDone(`נמחקו ${deleted} הוצאות. הרשימה נשמרה בקובץ שהורד`)
      setPreview(null)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המחיקה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...linkButtonStyle, marginBottom: 8 }}>
        ניקוי הוצאות בלי חשבונית
      </button>
    )
  }

  const recurringCount = preview?.items.filter((i) => i.isRecurring).length ?? 0
  const statementCount = preview?.items.filter((i) => i.fromStatement).length ?? 0

  return (
    <div style={{ ...cardStyle, marginBottom: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>מחיקת הוצאות בלי חשבונית</b>
        <button type="button" onClick={() => setOpen(false)} style={linkButtonStyle}>
          סגירה
        </button>
      </div>
      <p style={{ ...mutedTextStyle, margin: '4px 0 8px' }}>קודם רואים בדיוק מה יימחק. הוצאות שיש להן חשבונית לא נוגעים בהן.</p>

      <select
        value={scope}
        onChange={(e) => {
          setScope(e.target.value as Scope)
          setPreview(null)
        }}
        style={{ ...fieldInputStyle, minHeight: 40, fontSize: 14 }}
        aria-label="תקופה למחיקה"
      >
        <option value="all">כל התקופות</option>
        <option value="period" disabled={!range}>
          רק התקופה שנבחרה למעלה
        </option>
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 14 }}>
        <input
          type="checkbox"
          checked={includeRecurring}
          onChange={(e) => {
            setIncludeRecurring(e.target.checked)
            setPreview(null)
          }}
          style={{ width: 20, height: 20 }}
        />
        כולל הוצאות חוזרות (ההוצאה החוזרת עצמה תמשיך להיווצר)
      </label>

      <button type="button" disabled={busy} onClick={() => void show()} style={{ ...secondaryButtonStyle, minHeight: 40, fontSize: 14 }}>
        {busy && !preview ? 'טוען...' : 'הצגת הרשימה'}
      </button>

      {error && <p style={{ ...errorTextStyle, margin: '8px 0 0' }}>{error}</p>}
      {done && <p style={{ margin: '8px 0 0', fontWeight: 600 }}>{done}</p>}

      {preview && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600 }}>
            {preview.items.length} הוצאות · {formatMoney(preview.total)}
          </div>
          {(recurringCount > 0 || statementCount > 0) && (
            <p style={{ ...mutedTextStyle, margin: '2px 0 0' }}>
              {recurringCount > 0 ? `${recurringCount} חוזרות. ` : ''}
              {statementCount > 0 ? `${statementCount} נוצרו מדפי בנק ויחזרו לממתינות.` : ''}
            </p>
          )}

          <div style={{ maxHeight: 220, overflowY: 'auto', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {preview.items.map((i) => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  {i.description} · {formatOrderDate(i.date)}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{formatMoney(i.amount)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => downloadCsv(preview.items)} style={{ ...secondaryButtonStyle, minHeight: 40, fontSize: 14 }}>
              הורדת הרשימה
            </button>
            <button
              type="button"
              disabled={busy || preview.items.length === 0}
              onClick={() => void remove()}
              style={{ ...secondaryButtonStyle, minHeight: 40, fontSize: 14, color: 'var(--danger)', borderColor: 'var(--danger)', opacity: preview.items.length === 0 ? 0.5 : 1 }}
            >
              {busy ? 'מוחק...' : `מחיקת ${preview.items.length} הוצאות`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Saved with a byte-order mark so Excel opens the Hebrew correctly.
function downloadCsv(items: Item[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = [
    ['תאריך', 'תיאור', 'ספק', 'קטגוריה', 'סכום', 'חוזרת'].map(quote).join(','),
    ...items.map((i) => [i.date, i.description, i.supplier ?? '', i.typeName ?? '', String(i.amount), i.isRecurring ? 'כן' : ''].map(quote).join(',')),
  ]
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `expenses-without-receipt-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

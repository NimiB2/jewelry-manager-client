import { useState, type CSSProperties } from 'react'
import { formatOrderDate } from '../orders/dates'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, linkButtonStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import type { StatementLine } from './types'

type CreateBody = {
  description: string | null
  typeName: string | null
  groupName: string | null
  supplier: string | null
  repeatEveryMonths: number | null
}

type Props = {
  line: StatementLine
  types: string[]
  groups: string[]
  locked: boolean
  onMatch: (expenseId: string) => Promise<void>
  onCreate: (body: CreateBody) => Promise<void>
  onIgnore: () => Promise<void>
  onSettlement: () => Promise<void>
  onReset: () => Promise<void>
  onDeleteExpense: () => Promise<void>
}

// One statement line and what can be done with it. Money out only becomes an expense by a tap here.
export function LineCard({ line, types, groups, locked, onMatch, onCreate, onIgnore, onSettlement, onReset, onDeleteExpense }: Props) {
  const [creating, setCreating] = useState(false)
  // The bank's own words may be missing or cryptic, so the name of the expense is hers to write.
  const learned = line.learned
  const [description, setDescription] = useState(learned?.description ?? (line.description === 'ללא תיאור' ? '' : line.description))
  const [repeat, setRepeat] = useState(line.looksRecurring)
  const [typeName, setTypeName] = useState(learned?.typeName ?? '')
  const [groupName, setGroupName] = useState(learned?.groupName ?? '')
  const [supplier, setSupplier] = useState(learned?.supplier ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || locked
  const pending = line.status === 'PENDING'
  const settlement = line.status === 'CARD_SETTLEMENT'
  const uncovered = settlement && !line.coveredByCardStatement

  return (
    <div style={{ ...cardStyle, marginBottom: 8, border: `1px solid ${uncovered ? 'var(--warning)' : 'transparent'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{line.description}</div>
          <div style={mutedTextStyle}>
            {formatOrderDate(line.date)} · {line.source === 'BANK' ? 'בנק' : 'אשראי'}
          </div>
        </div>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatMoney(Math.abs(line.amount))}</div>
      </div>

      {settlement && (
        <p style={{ ...mutedTextStyle, margin: '6px 0 0', color: uncovered ? 'var(--warning)' : undefined }}>
          {uncovered ? 'חיוב כרטיס אשראי. חסר דף אשראי בסכום הזה' : 'חיוב כרטיס אשראי, מכוסה בדף האשראי שהועלה'}
        </p>
      )}

      {(line.status === 'MATCHED' || line.status === 'CREATED') && (
        <p style={{ ...mutedTextStyle, margin: '6px 0 0' }}>
          {line.status === 'MATCHED' ? 'הותאמה להוצאה: ' : 'נוצרה הוצאה: '}
          {line.expenseDescription}
        </p>
      )}

      {pending && line.suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={mutedTextStyle}>הוצאות שהוזנו, אולי זו אותה אחת:</div>
          {line.suggestions.map((s) => (
            <button
              key={s.expenseId}
              type="button"
              disabled={disabled}
              onClick={() => void run(() => onMatch(s.expenseId))}
              style={{ ...suggestionStyle, borderColor: s.strong ? 'var(--accent)' : 'var(--border)' }}
            >
              <span>
                {s.description}
                {s.supplier ? ` · ${s.supplier}` : ''} · {formatOrderDate(s.date)}
              </span>
              <span style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>זו אותה הוצאה</span>
            </button>
          ))}
        </div>
      )}

      {pending && !creating && learned && (
        <p style={{ ...mutedTextStyle, margin: '8px 0 0' }}>
          כמו בפעם הקודמת: {learned.description}
          {learned.typeName ? ` · ${learned.typeName}` : ''}
          {line.looksRecurring ? ' · נראית חוזרת כל חודש' : ''}
        </p>
      )}

      {pending && !creating && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {learned ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                void run(() =>
                  onCreate({ description: learned.description, typeName: learned.typeName, groupName: learned.groupName, supplier: learned.supplier, repeatEveryMonths: null }),
                )
              }
              style={{ ...primaryButtonStyle, minHeight: 40, fontSize: 14, flex: 1 }}
            >
              {busy ? 'שומר...' : 'הוספה כמו קודם'}
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCreating(true)}
            style={{ ...(learned ? secondaryButtonStyle : primaryButtonStyle), minHeight: 40, fontSize: 14, flex: learned ? undefined : 1 }}
          >
            {learned ? 'עריכה' : 'הוספה כהוצאה'}
          </button>
          <button type="button" disabled={disabled} onClick={() => void run(onIgnore)} style={{ ...secondaryButtonStyle, minHeight: 40, fontSize: 14 }}>
            לא הוצאה
          </button>
          {line.source === 'BANK' && (
            <button type="button" disabled={disabled} onClick={() => void run(onSettlement)} style={{ ...secondaryButtonStyle, minHeight: 40, fontSize: 14 }}>
              חיוב אשראי
            </button>
          )}
        </div>
      )}

      {pending && creating && (
        <div style={{ marginTop: 8 }}>
          <input placeholder="שם ההוצאה" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...smallField, marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={typeName} onChange={(e) => setTypeName(e.target.value)} style={smallField}>
              <option value="">קטגוריה</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={groupName} onChange={(e) => setGroupName(e.target.value)} style={smallField}>
              <option value="">קבוצה לפי הקטגוריה</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <input placeholder="ספק (לא חובה)" value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...smallField, marginTop: 8 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 14 }}>
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} style={{ width: 20, height: 20 }} />
            הוצאה חוזרת, כל חודש
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void run(() => onCreate({ description: description.trim() || null, typeName: typeName || null, groupName: groupName || null, supplier: supplier.trim() || null, repeatEveryMonths: repeat ? 1 : null }))}
              style={{ ...primaryButtonStyle, minHeight: 40, fontSize: 14, flex: 1 }}
            >
              {busy ? 'שומר...' : 'שמירה'}
            </button>
            <button type="button" disabled={busy} onClick={() => setCreating(false)} style={{ ...secondaryButtonStyle, minHeight: 40, fontSize: 14 }}>
              ביטול
            </button>
          </div>
        </div>
      )}

      {!pending && !locked && (
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <button type="button" disabled={busy} onClick={() => void run(onReset)} style={linkButtonStyle}>
            החזרה לממתינות
          </button>
          {line.status === 'CREATED' && line.expenseId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('למחוק את ההוצאה? השורה תחזור לממתינות.')) void run(onDeleteExpense)
              }}
              style={{ ...linkButtonStyle, color: 'var(--danger)' }}
            >
              מחיקת ההוצאה
            </button>
          )}
        </div>
      )}

      {error && <p style={{ ...errorTextStyle, margin: '6px 0 0' }}>{error}</p>}
    </div>
  )
}

const smallField: CSSProperties = { ...fieldInputStyle, minHeight: 40, fontSize: 14, minWidth: 0 }

const suggestionStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  marginTop: 6,
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 13,
  textAlign: 'right',
  cursor: 'pointer',
}

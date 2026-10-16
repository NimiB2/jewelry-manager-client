import { useState, type CSSProperties } from 'react'
import { formatOrderDate } from '../orders/dates'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, linkButtonStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import type { StatementLine } from './types'

type CreateBody = { typeName: string | null; groupName: string | null; supplier: string | null }

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
}

// One statement line and what can be done with it. Money out only becomes an expense by a tap here.
export function LineCard({ line, types, groups, locked, onMatch, onCreate, onIgnore, onSettlement, onReset }: Props) {
  const [creating, setCreating] = useState(false)
  const [typeName, setTypeName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [supplier, setSupplier] = useState('')
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

      {pending && !creating && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={disabled} onClick={() => setCreating(true)} style={{ ...primaryButtonStyle, minHeight: 40, fontSize: 14, flex: 1 }}>
            הוספה כהוצאה
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
              <option value="">ללא קבוצה</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <input placeholder="ספק (לא חובה)" value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...smallField, marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void run(() => onCreate({ typeName: typeName || null, groupName: groupName || null, supplier: supplier.trim() || null }))}
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
        <button type="button" disabled={busy} onClick={() => void run(onReset)} style={{ ...linkButtonStyle, marginTop: 4 }}>
          החזרה לממתינות
        </button>
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

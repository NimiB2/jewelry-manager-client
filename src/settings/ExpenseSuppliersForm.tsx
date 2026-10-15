import { useMemo, useState } from 'react'
import { apiFetch, apiJson } from '../api'
import { similarSupplierGroups } from '../finances/supplierMatch'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { addRowButtonStyle, nameInputStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { DragHandle, useDragReorder } from './useDragReorder'

function isValid(names: string[]): boolean {
  const trimmed = names.map((n) => n.trim())
  return !trimmed.some((n) => n === '') && new Set(trimmed).size === trimmed.length
}

async function saveSuppliers(names: string[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenseSuppliers: names.map((n) => n.trim()) }),
  })
}

type ExpenseSuppliersFormProps = {
  initialSuppliers: string[]
}

// The suppliers she picks from on a new expense. One typed there by hand joins this list by itself;
// the first ones are offered as quick choices, so the order here is the order there.
// The same supplier written in several ways can be merged into one, which also updates its expenses.
export function ExpenseSuppliersForm({ initialSuppliers }: ExpenseSuppliersFormProps) {
  const { value: names, setValue: setNames, status, valid, hasChanges, undo } = useAutosaveSection(
    initialSuppliers,
    saveSuppliers,
    isValid,
  )
  const reorder = useDragReorder(setNames)

  const [mergeMode, setMergeMode] = useState(false)
  const [checked, setChecked] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergeDone, setMergeDone] = useState<string | null>(null)

  const suggestions = useMemo(() => similarSupplierGroups(names.map((n) => n.trim()).filter(Boolean)), [names])

  function startMerge(group: string[]) {
    setMergeMode(true)
    setChecked(group)
    // The shortest spelling is usually the plain name.
    setTarget([...group].sort((a, b) => a.length - b.length)[0])
    setMergeError(null)
    setMergeDone(null)
  }

  function toggleChecked(name: string) {
    const next = checked.includes(name) ? checked.filter((n) => n !== name) : [...checked, name]
    setChecked(next)
    if (!next.includes(target)) setTarget(next[0] ?? '')
  }

  function cancelMerge() {
    setMergeMode(false)
    setChecked([])
    setTarget('')
    setMergeError(null)
  }

  async function merge() {
    if (checked.length < 2 || !target) return
    setMerging(true)
    setMergeError(null)
    try {
      await apiJson('/expenses/suppliers/merge', { method: 'POST', body: JSON.stringify({ target, names: checked }) })
      setNames((prev) => prev.filter((n) => n === target || !checked.includes(n)))
      setMergeDone(`${checked.length} ספקים אוחדו ל"${target}"`)
      setMergeMode(false)
      setChecked([])
      setTarget('')
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'האיחוד נכשל')
    } finally {
      setMerging(false)
    }
  }

  return (
    <Section title="ספקים" count={names.length} action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0 }}>
        ספק שמקלידים בהוצאה חדשה נוסף לכאן לבד, ומוצג כבחירה מהירה בהוצאה הבאה. מחיקה מכאן לא משנה הוצאות קיימות.
      </p>

      {!mergeMode && suggestions.length > 0 && (
        <div style={suggestBoxStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>אולי אותו ספק</div>
          {suggestions.map((group) => (
            <div key={group.join('|')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{group.join(' · ')}</span>
              <button type="button" onClick={() => startMerge(group)} style={linkButtonStyle}>
                איחוד
              </button>
            </div>
          ))}
        </div>
      )}

      {mergeDone && <p style={{ ...statusTextStyle, color: 'var(--success)' }}>{mergeDone}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {names.map((name, index) => (
          <div
            key={index}
            ref={reorder.rowRef(index)}
            style={{
              ...reorder.rowStyle(index),
              display: 'grid',
              gridTemplateColumns: mergeMode ? '28px 1fr' : '28px 1fr 32px',
              gap: 6,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 2,
            }}
          >
            {mergeMode ? (
              <input
                type="checkbox"
                checked={checked.includes(name)}
                onChange={() => toggleChecked(name)}
                aria-label={`בחירת ${name}`}
                style={{ width: 20, height: 20, justifySelf: 'center' }}
              />
            ) : (
              <DragHandle {...reorder.handleProps(index)} />
            )}
            <input
              type="text"
              value={name}
              maxLength={100}
              readOnly={mergeMode}
              onChange={(e) => setNames((prev) => prev.map((n, i) => (i === index ? e.target.value : n)))}
              placeholder="שם הספק"
              aria-label="שם הספק"
              style={nameInputStyle}
            />
            {!mergeMode && (
              <ConfirmDeleteButton
                onConfirm={() => setNames((prev) => prev.filter((_, i) => i !== index))}
                ariaLabel={`הסר את ${name || 'הספק'}`}
              />
            )}
          </div>
        ))}
      </div>

      {names.length === 0 && <p style={statusTextStyle}>עוד אין ספקים. הם יתווספו לבד כשתקלידי ספק בהוצאה.</p>}

      {mergeMode ? (
        <div style={mergeBarStyle}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>סמני את הספקים שהם אותו ספק (לפחות שניים), ובחרי את השם שיישאר.</div>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="השם שיישאר"
            disabled={checked.length === 0}
            style={{ width: '100%', minHeight: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', padding: '0 8px' }}
          >
            {checked.length === 0 && <option value="">בחרי ספקים מהרשימה</option>}
            {checked.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <p style={{ ...statusTextStyle, margin: '6px 0' }}>כל ההוצאות של הספקים שסומנו יעברו לשם הזה. לא ניתן לבטל.</p>
          {mergeError && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>{mergeError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void merge()}
              disabled={merging || checked.length < 2 || !target}
              style={{ ...mergeButtonStyle, opacity: checked.length < 2 ? 0.5 : 1 }}
            >
              {merging ? 'מאחד...' : `איחוד ${checked.length} ספקים`}
            </button>
            <button type="button" onClick={cancelMerge} disabled={merging} style={cancelButtonStyle}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setNames((prev) => ['', ...prev])} style={{ ...addRowButtonStyle, flex: 1 }}>
            + הוספת ספק
          </button>
          {names.length > 1 && (
            <button type="button" onClick={() => startMerge([])} style={{ ...addRowButtonStyle, flex: 1 }}>
              איחוד ספקים
            </button>
          )}
        </div>
      )}

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל ספק חייב להיות שם ייחודי. השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

const suggestBoxStyle: React.CSSProperties = {
  margin: '0 0 8px',
  padding: '8px 10px',
  borderRadius: 8,
  background: 'var(--warning-bg)',
}

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const mergeBarStyle: React.CSSProperties = {
  marginTop: 10,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
}

const mergeButtonStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 44,
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const cancelButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '0 16px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 14,
  cursor: 'pointer',
}

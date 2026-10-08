import { apiFetch } from '../api'
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
export function ExpenseSuppliersForm({ initialSuppliers }: ExpenseSuppliersFormProps) {
  const { value: names, setValue: setNames, status, valid, hasChanges, undo } = useAutosaveSection(
    initialSuppliers,
    saveSuppliers,
    isValid,
  )
  const reorder = useDragReorder(setNames)

  return (
    <Section title="ספקים" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0 }}>
        ספק שמקלידים בהוצאה חדשה נוסף לכאן לבד, ומוצג כבחירה מהירה בהוצאה הבאה. מחיקה מכאן לא משנה הוצאות קיימות.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {names.map((name, index) => (
          <div
            key={index}
            ref={reorder.rowRef(index)}
            style={{
              ...reorder.rowStyle(index),
              display: 'grid',
              gridTemplateColumns: '28px 1fr 32px',
              gap: 6,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
            }}
          >
            <DragHandle {...reorder.handleProps(index)} />
            <input
              type="text"
              value={name}
              maxLength={100}
              onChange={(e) => setNames((prev) => prev.map((n, i) => (i === index ? e.target.value : n)))}
              placeholder="שם הספק"
              aria-label="שם הספק"
              style={nameInputStyle}
            />
            <ConfirmDeleteButton
              onConfirm={() => setNames((prev) => prev.filter((_, i) => i !== index))}
              ariaLabel={`הסר את ${name || 'הספק'}`}
            />
          </div>
        ))}
      </div>

      {names.length === 0 && <p style={statusTextStyle}>עוד אין ספקים. הם יתווספו לבד כשתקלידי ספק בהוצאה.</p>}

      <button type="button" onClick={() => setNames((prev) => ['', ...prev])} style={addRowButtonStyle}>
        + הוספת ספק
      </button>

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

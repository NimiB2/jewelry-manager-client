import { apiFetch } from '../api'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { addRowButtonStyle, nameInputStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { DragHandle, useDragReorder } from './useDragReorder'

function isValid(types: string[]): boolean {
  const trimmed = types.map((t) => t.trim())
  return !trimmed.some((t) => t === '') && new Set(trimmed).size === trimmed.length
}

async function saveTypes(types: string[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenseTypes: types.map((t) => t.trim()) }),
  })
}

type ExpenseTypesFormProps = {
  initialTypes: string[]
}

// The categories she picks from when she records an expense (materials, packaging, marketing...).
export function ExpenseTypesForm({ initialTypes }: ExpenseTypesFormProps) {
  const { value: types, setValue: setTypes, status, valid, hasChanges, undo } = useAutosaveSection(
    initialTypes,
    saveTypes,
    isValid,
  )

  const reorder = useDragReorder(setTypes)

  return (
    <Section title="קטגוריות הוצאה" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0 }}>
        הקטגוריות שמופיעות כשמוסיפים הוצאה, למשל קניית חומר, אריזה, שיווק.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {types.map((type, index) => (
          <div
            key={index}
            ref={reorder.rowRef(index)}
            style={{
              ...reorder.rowStyle(index),
              display: 'grid',
              gridTemplateColumns: '28px 1fr 32px',
              gap: 6,
              alignItems: 'start',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
            }}
          >
            <DragHandle {...reorder.handleProps(index)} />
            <input
              type="text"
              value={type}
              maxLength={100}
              onChange={(e) => setTypes((prev) => prev.map((t, i) => (i === index ? e.target.value : t)))}
              placeholder="לדוגמה: קניית חומר"
              aria-label="שם קטגוריית ההוצאה"
              style={nameInputStyle}
            />
            <ConfirmDeleteButton
              onConfirm={() => setTypes((prev) => prev.filter((_, i) => i !== index))}
              ariaLabel={`הסר את ${type || 'הקטגוריה'}`}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setTypes((prev) => [...prev, ''])} style={addRowButtonStyle}>
        + הוספת קטגוריה
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל קטגוריה חייב להיות שם ייחודי. השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

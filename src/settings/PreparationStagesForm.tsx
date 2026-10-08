import { apiFetch } from '../api'
import { nameInputStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { DragHandle, useDragReorder } from './useDragReorder'

function isValid(stages: string[]): boolean {
  const trimmed = stages.map((s) => s.trim())
  return !trimmed.some((s) => s === '') && new Set(trimmed).size === trimmed.length
}

async function saveStages(stages: string[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preparationStages: stages.map((s) => s.trim()) }),
  })
}

type PreparationStagesFormProps = {
  initialStages: string[]
}

export function PreparationStagesForm({ initialStages }: PreparationStagesFormProps) {
  const { value: stages, setValue: setStages, status, valid, hasChanges, undo } = useAutosaveSection(
    initialStages,
    saveStages,
    isValid,
  )
  const reorder = useDragReorder(setStages)

  function updateStage(index: number, value: string) {
    setStages((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  function addStage() {
    setStages((prev) => [...prev, ''])
  }

  return (
    <Section title="שלבי הכנה" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map((stage, index) => (
          <div
            key={index}
            ref={reorder.rowRef(index)}
            style={{
              ...reorder.rowStyle(index),
              display: 'grid',
              gridTemplateColumns: '20px 28px 1fr 32px',
              gap: 6,
              alignItems: 'start',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {index + 1}
            </span>
            <DragHandle {...reorder.handleProps(index)} />
            <input
              type="text"
              value={stage}
              onChange={(e) => updateStage(index, e.target.value)}
              placeholder="לדוגמה: יציקה"
              aria-label="שם שלב ההכנה"
              style={nameInputStyle}
            />
            <ConfirmDeleteButton onConfirm={() => removeStage(index)} ariaLabel={`הסר את ${stage || 'השלב'}`} />
          </div>
        ))}
      </div>

      <button type="button" onClick={addStage} style={addRowButtonStyle}>
        + הוספת שלב
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל שלב חייב להיות שם ייחודי — השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>
      )}
    </Section>
  )
}

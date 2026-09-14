import { useRef, useState } from 'react'
import { apiFetch } from '../api'
import { nameInputStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'

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

type DragState = { index: number; startY: number; deltaY: number }

type PreparationStagesFormProps = {
  initialStages: string[]
}

export function PreparationStagesForm({ initialStages }: PreparationStagesFormProps) {
  const { value: stages, setValue: setStages, status, valid, hasChanges, undo } = useAutosaveSection(
    initialStages,
    saveStages,
    isValid,
  )
  const [drag, setDrag] = useState<DragState | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  function updateStage(index: number, value: string) {
    setStages((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  function addStage() {
    setStages((prev) => [...prev, ''])
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ index, startY: e.clientY, deltaY: 0 })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    const deltaY = e.clientY - drag.startY
    const currentRect = rowRefs.current[drag.index]?.getBoundingClientRect()
    if (!currentRect) return
    const currentMid = currentRect.top + currentRect.height / 2 + deltaY

    for (let i = 0; i < rowRefs.current.length; i++) {
      if (i === drag.index) continue
      const rect = rowRefs.current[i]?.getBoundingClientRect()
      if (!rect) continue
      const mid = rect.top + rect.height / 2
      const crossedDown = i > drag.index && currentMid > mid
      const crossedUp = i < drag.index && currentMid < mid
      if (crossedDown || crossedUp) {
        setStages((prev) => {
          const next = [...prev]
          ;[next[drag.index], next[i]] = [next[i], next[drag.index]]
          return next
        })
        setDrag({ index: i, startY: e.clientY, deltaY: 0 })
        return
      }
    }

    setDrag({ ...drag, deltaY })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDrag(null)
  }

  return (
    <Section title="שלבי הכנה" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map((stage, index) => (
          <div
            key={index}
            ref={(el) => {
              rowRefs.current[index] = el
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 28px 1fr 32px',
              gap: 6,
              alignItems: 'start',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
              background: 'var(--surface)',
              position: 'relative',
              zIndex: drag?.index === index ? 10 : 'auto',
              transform: drag?.index === index ? `translateY(${drag.deltaY}px)` : undefined,
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
            <button
              type="button"
              onPointerDown={(e) => handlePointerDown(e, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="גרירה לשינוי סדר"
              style={dragHandleStyle}
            >
              ⠿
            </button>
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

const dragHandleStyle: React.CSSProperties = {
  width: 28,
  height: 36,
  border: 'none',
  background: 'transparent',
  color: 'var(--chevron)',
  fontSize: 18,
  cursor: 'grab',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

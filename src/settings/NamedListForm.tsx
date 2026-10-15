import { useEffect } from 'react'
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

type NamedListFormProps = {
  // The settings field the list is saved under, e.g. 'expenseGroups'.
  field: string
  title: string
  description: string
  placeholder: string
  addLabel: string
  initialNames: string[]
  // Called with the current names, so another section can offer them as choices.
  onNamesChange?: (names: string[]) => void
}

// A plain list of names she can add to, rename, reorder and remove; saves by itself.
export function NamedListForm({ field, title, description, placeholder, addLabel, initialNames, onNamesChange }: NamedListFormProps) {
  const { value: names, setValue: setNames, status, valid, hasChanges, undo } = useAutosaveSection(
    initialNames,
    (list: string[]) =>
      apiFetch('/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: list.map((n) => n.trim()) }),
      }),
    isValid,
  )

  const reorder = useDragReorder(setNames)

  useEffect(() => {
    if (valid) onNamesChange?.(names.map((n) => n.trim()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, valid])

  return (
    <Section title={title} count={names.length} action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0 }}>{description}</p>

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
              alignItems: 'start',
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
              placeholder={placeholder}
              aria-label={title}
              style={nameInputStyle}
            />
            <ConfirmDeleteButton
              onConfirm={() => setNames((prev) => prev.filter((_, i) => i !== index))}
              ariaLabel={`הסר את ${name || 'הפריט'}`}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setNames((prev) => [...prev, ''])} style={addRowButtonStyle}>
        {addLabel}
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל פריט חייב להיות שם ייחודי. השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

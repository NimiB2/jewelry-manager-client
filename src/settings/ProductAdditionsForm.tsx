import { apiFetch } from '../api'
import { nameInputStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'

export type ProductAdditionType = { name: string; allowsCustomName: boolean }

function isValid(types: ProductAdditionType[]): boolean {
  const names = types.map((t) => t.name.trim())
  return !names.some((n) => n === '') && new Set(names).size === names.length
}

async function saveTypes(types: ProductAdditionType[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productAdditionTypes: types.map((t) => ({ name: t.name.trim(), allowsCustomName: t.allowsCustomName })),
    }),
  })
}

type ProductAdditionsFormProps = {
  initialTypes: ProductAdditionType[]
}

// The options offered under "additions" when building a product (stone, setting, plating...).
// A type with "free name" lets her type any name when she adds it to a product ("other").
export function ProductAdditionsForm({ initialTypes }: ProductAdditionsFormProps) {
  const { value: types, setValue: setTypes, status, valid, hasChanges, undo } = useAutosaveSection(
    initialTypes,
    saveTypes,
    isValid,
  )

  function updateName(index: number, name: string) {
    setTypes((prev) => prev.map((t, i) => (i === index ? { ...t, name } : t)))
  }

  function toggleCustom(index: number) {
    setTypes((prev) => prev.map((t, i) => (i === index ? { ...t, allowsCustomName: !t.allowsCustomName } : t)))
  }

  function removeType(index: number) {
    setTypes((prev) => prev.filter((_, i) => i !== index))
  }

  function addType() {
    setTypes((prev) => [...prev, { name: '', allowsCustomName: false }])
  }

  return (
    <Section title="תוספות למוצר" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0, marginBottom: 8 }}>
        האפשרויות שיופיעו ברשימת התוספות במחשבון המוצרים. את המחיר ממלאים בכל מוצר בנפרד.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {types.map((type, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 32px',
              gap: 8,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
            }}
          >
            <input
              type="text"
              value={type.name}
              onChange={(e) => updateName(index, e.target.value)}
              placeholder="לדוגמה: אבן"
              aria-label="שם התוספת"
              style={nameInputStyle}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={type.allowsCustomName} onChange={() => toggleCustom(index)} />
              שם חופשי
            </label>
            <ConfirmDeleteButton onConfirm={() => removeType(index)} ariaLabel={`הסר את ${type.name || 'התוספת'}`} />
          </div>
        ))}
      </div>

      <button type="button" onClick={addType} style={addRowButtonStyle}>
        + הוספת תוספת
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל תוספת חייב להיות שם ייחודי — השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

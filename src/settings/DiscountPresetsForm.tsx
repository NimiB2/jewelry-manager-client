import { apiFetch } from '../api'
import { cellInputStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'

// Percentages are edited as text so a half-typed value like "12." isn't thrown away.
function toRows(percents: number[]): string[] {
  return percents.map(String)
}

function isValid(rows: string[]): boolean {
  const numbers = rows.map(Number)
  return (
    rows.every((r) => r.trim() !== '') &&
    numbers.every((n) => Number.isFinite(n) && n > 0 && n <= 100) &&
    new Set(numbers).size === numbers.length
  )
}

async function savePresets(rows: string[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discountPresets: rows.map(Number) }),
  })
}

type DiscountPresetsFormProps = {
  initialPercents: number[]
}

// The quick-pick buttons (5%, 10%, 15%...) on the product list's discount simulator.
export function DiscountPresetsForm({ initialPercents }: DiscountPresetsFormProps) {
  const { value: rows, setValue: setRows, status, valid, hasChanges, undo } = useAutosaveSection(
    toRows(initialPercents),
    savePresets,
    isValid,
  )

  function update(index: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? value : r)))
  }

  return (
    <Section title="הנחות מהירות" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0, marginBottom: 8 }}>
        אחוזי הנחה שמופיעים ככפתורים בסימולטור ההנחה ברשימת המוצרים.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 32px',
              gap: 6,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                value={row}
                onChange={(e) => update(index, e.target.value)}
                aria-label="אחוז הנחה"
                style={{ ...cellInputStyle, width: 80, textAlign: 'right' }}
              />
              <span style={{ fontSize: 14, color: 'var(--accent)' }}>%</span>
            </div>
            <ConfirmDeleteButton
              onConfirm={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              ariaLabel={`הסר את ${row || 'ההנחה'}%`}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setRows((prev) => [...prev, ''])} style={addRowButtonStyle}>
        + הוספת אחוז הנחה
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          כל אחוז חייב להיות ייחודי ובין 0 ל-100 — השמירה מושהית עד שהשגיאה תתוקן.
        </p>
      )}
      {valid && status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {valid && status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

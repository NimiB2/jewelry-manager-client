import { apiFetch } from '../api'
import { TrashIcon } from '../icons/TrashIcon'
import { nameInputStyle, cellInputStyle, iconButtonStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'

type Material = {
  name: string
  pricePerGram: string
  laborHoursPerGram: string
  profitMultiplier: string
}

export type MaterialsRecord = Record<
  string,
  { pricePerGram: number; laborHoursPerGram: number; profitMultiplier: number }
>

function toRows(materials: MaterialsRecord): Material[] {
  return Object.entries(materials).map(([name, values]) => ({
    name,
    pricePerGram: String(values.pricePerGram),
    laborHoursPerGram: String(values.laborHoursPerGram),
    profitMultiplier: String(values.profitMultiplier),
  }))
}

function rowsToRecord(rows: Material[]): MaterialsRecord {
  const materials: MaterialsRecord = {}
  for (const row of rows) {
    materials[row.name.trim()] = {
      pricePerGram: Number(row.pricePerGram) || 0,
      laborHoursPerGram: Number(row.laborHoursPerGram) || 0,
      profitMultiplier: Number(row.profitMultiplier) || 0,
    }
  }
  return materials
}

function isValid(rows: Material[]): boolean {
  const trimmedNames = rows.map((row) => row.name.trim())
  return !trimmedNames.some((name) => name === '') && new Set(trimmedNames).size === trimmedNames.length
}

async function saveMaterials(rows: Material[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materials: rowsToRecord(rows) }),
  })
}

type MaterialsFormProps = {
  initialMaterials: MaterialsRecord
}

export function MaterialsForm({ initialMaterials }: MaterialsFormProps) {
  const initialRows = toRows(initialMaterials)
  const { value: rows, setValue: setRows, status, valid, hasChanges, undo } = useAutosaveSection(
    initialRows,
    saveMaterials,
    isValid,
  )

  function updateRow(index: number, field: keyof Material, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', pricePerGram: '', laborHoursPerGram: '', profitMultiplier: '' }])
  }

  return (
    <Section title="חומרים" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 4 }}>
        <span style={{ ...headerStyle, textAlign: 'right' }}>שם</span>
        <span style={headerStyle}>מחיר</span>
        <span style={headerStyle}>שעות</span>
        <span style={headerStyle}>מכפיל</span>
        <span />

        {rows.map((row, index) => (
          <div key={index} style={{ display: 'contents' }}>
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(index, 'name', e.target.value)}
              placeholder="זהב"
              aria-label="שם החומר"
              style={{ ...nameInputStyle, borderBottom: '1px solid var(--border)' }}
            />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={row.pricePerGram}
              onChange={(e) => updateRow(index, 'pricePerGram', e.target.value)}
              aria-label="מחיר לגרם"
              style={{ ...cellInputStyle, borderBottom: '1px solid var(--border)' }}
            />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={row.laborHoursPerGram}
              onChange={(e) => updateRow(index, 'laborHoursPerGram', e.target.value)}
              aria-label="שעות עבודה לגרם"
              style={{ ...cellInputStyle, borderBottom: '1px solid var(--border)' }}
            />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={row.profitMultiplier}
              onChange={(e) => updateRow(index, 'profitMultiplier', e.target.value)}
              aria-label="מכפיל רווח"
              style={{ ...cellInputStyle, borderBottom: '1px solid var(--border)' }}
            />
            <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label={`הסר את ${row.name || 'החומר'}`}
                style={{ ...iconButtonStyle, width: 28, height: 28 }}
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} style={addRowButtonStyle}>
        + הוספת חומר
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל חומר חייב להיות שם ייחודי — השמירה מושהית עד שהשגיאה תתוקן.
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

const gridColumns = 'minmax(0,1.3fr) minmax(0,0.8fr) minmax(0,0.8fr) minmax(0,0.8fr) 32px'

const headerStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  textAlign: 'center',
  paddingBottom: 4,
}

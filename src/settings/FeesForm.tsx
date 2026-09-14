import { apiFetch } from '../api'
import { nameInputStyle, cellInputStyle, addRowButtonStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'

type FeeItem = { name: string; percent: string }

export type FeesItemsRecord = { name: string; percent: number }[]

function toRows(items: FeesItemsRecord): FeeItem[] {
  return items.map((item) => ({ name: item.name, percent: String(item.percent) }))
}

function rowsToRecord(rows: FeeItem[]): FeesItemsRecord {
  return rows.map((row) => ({ name: row.name.trim(), percent: Number(row.percent) || 0 }))
}

function isValid(rows: FeeItem[]): boolean {
  const trimmedNames = rows.map((row) => row.name.trim())
  return !trimmedNames.some((name) => name === '') && new Set(trimmedNames).size === trimmedNames.length
}

async function saveFees(rows: FeeItem[]) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feesItems: rowsToRecord(rows) }),
  })
}

type FeesFormProps = {
  initialItems: FeesItemsRecord
}

export function FeesForm({ initialItems }: FeesFormProps) {
  const initialRows = toRows(initialItems)
  const { value: rows, setValue: setRows, status, valid, hasChanges, undo } = useAutosaveSection(
    initialRows,
    saveFees,
    isValid,
  )

  function updateRow(index: number, field: keyof FeeItem, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', percent: '' }])
  }

  const combinedFactor = 1 + rows.reduce((sum, row) => sum + (Number(row.percent) || 0), 0) / 100

  return (
    <Section title="עמלות" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        כל עמלה היא אחוז מהעלות (בדומה למע"מ) — לדוגמה 17%.
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
        מקדם כולל: <span style={{ color: 'var(--accent)' }}>×{combinedFactor.toFixed(2)}</span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 64px 32px',
              gap: 6,
              alignItems: 'start',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
            }}
          >
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(index, 'name', e.target.value)}
              placeholder="לדוגמה: עלויות קבועות"
              aria-label="שם העמלה"
              style={nameInputStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                value={row.percent}
                onChange={(e) => updateRow(index, 'percent', e.target.value)}
                aria-label="אחוז"
                style={{ ...cellInputStyle, textAlign: 'left', paddingInlineEnd: 0 }}
              />
              <span style={{ fontSize: 14, color: 'var(--accent)' }}>%</span>
            </div>
            <ConfirmDeleteButton onConfirm={() => removeRow(index)} ariaLabel={`הסר את ${row.name || 'העמלה'}`} />
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} style={addRowButtonStyle}>
        + הוספת עמלה
      </button>

      {!valid && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>
          לכל עמלה חייב להיות שם ייחודי — השמירה מושהית עד שהשגיאה תתוקן.
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

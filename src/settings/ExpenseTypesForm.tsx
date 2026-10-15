import { useEffect, useRef } from 'react'
import { apiFetch } from '../api'
import { defaultGroupFor } from '../finances/defaultGroup'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { addRowButtonStyle, nameInputStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'
import { DragHandle, useDragReorder } from './useDragReorder'

type TypeRow = { name: string; group: string }

function isValid(rows: TypeRow[]): boolean {
  const trimmed = rows.map((r) => r.name.trim())
  return !trimmed.some((t) => t === '') && new Set(trimmed).size === trimmed.length
}

async function saveTypes(rows: TypeRow[]) {
  const groups: Record<string, string> = {}
  for (const r of rows) if (r.group) groups[r.name.trim()] = r.group

  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenseTypes: rows.map((r) => r.name.trim()), expenseTypeGroups: groups }),
  })
}

type ExpenseTypesFormProps = {
  initialTypes: string[]
  // Saved group per category name.
  initialGroups: Record<string, string>
  // The expense groups she can choose from.
  groups: string[]
}

// The categories she picks from when she records an expense (materials, packaging, marketing...),
// each with the group it belongs to by default (orders, business, home...).
export function ExpenseTypesForm({ initialTypes, initialGroups, groups }: ExpenseTypesFormProps) {
  const initialRows = useRef<TypeRow[]>(initialTypes.map((name) => ({ name, group: initialGroups[name] ?? '' })))
  const { value: rows, setValue: setRows, status, valid, hasChanges, undo } = useAutosaveSection(
    initialRows.current,
    saveTypes,
    isValid,
  )

  // First time on this screen: categories that had no saved group start with the one the app used to
  // guess for them (her old choices on this device, then the words in the name). She can change each.
  useEffect(() => {
    if (Object.keys(initialGroups).length > 0 || groups.length === 0) return
    setRows((prev) => prev.map((r) => (r.group ? r : { ...r, group: defaultGroupFor(r.name, groups) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reorder = useDragReorder(setRows)
  const withoutGroup = rows.filter((r) => r.name.trim() && !r.group).length

  return (
    <Section title="קטגוריות הוצאה" count={rows.length} action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0 }}>
        הקטגוריות שמופיעות כשמוסיפים הוצאה. הקבוצה נבחרת מראש בהוצאה ובניתוח, ואפשר לשנות לכל הוצאה.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            ref={reorder.rowRef(index)}
            style={{
              ...reorder.rowStyle(index),
              display: 'grid',
              gridTemplateColumns: '28px minmax(0, 1fr) 112px 32px',
              gap: 6,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 2,
            }}
          >
            <DragHandle {...reorder.handleProps(index)} />
            <input
              type="text"
              value={row.name}
              maxLength={100}
              onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))}
              placeholder="לדוגמה: קניית חומר"
              aria-label="שם קטגוריית ההוצאה"
              style={nameInputStyle}
            />
            <select
              value={row.group}
              onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, group: e.target.value } : r)))}
              aria-label={`קבוצה של ${row.name || 'הקטגוריה'}`}
              style={{
                minHeight: 32,
                width: '100%',
                padding: '0 4px',
                fontSize: 12,
                borderRadius: 6,
                border: `1px solid ${row.group || !row.name.trim() ? 'var(--border)' : 'var(--warning)'}`,
                background: 'var(--surface)',
                color: row.group ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              <option value="">בחרי קבוצה</option>
              {row.group && !groups.includes(row.group) && <option value={row.group}>{row.group}</option>}
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ConfirmDeleteButton
              onConfirm={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              ariaLabel={`הסר את ${row.name || 'הקטגוריה'}`}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setRows((prev) => [...prev, { name: '', group: '' }])} style={addRowButtonStyle}>
        + הוספת קטגוריה
      </button>

      {withoutGroup > 0 && (
        <p style={statusTextStyle}>ל-{withoutGroup} קטגוריות עוד אין קבוצה, ובניתוח הן יופיעו תחת "ללא קבוצה".</p>
      )}
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

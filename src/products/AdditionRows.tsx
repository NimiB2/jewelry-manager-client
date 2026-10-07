import { type AdditionRow, type AdditionType } from './additionRowHelpers'
import { newRow } from './additionRowHelpers'
import { fieldInputStyle, linkButtonStyle, mutedTextStyle } from './productStyles'

type AdditionRowsProps = {
  rows: AdditionRow[]
  types: AdditionType[]
  onChange: (rows: AdditionRow[]) => void
}

export function AdditionRows({ rows, types, onChange }: AdditionRowsProps) {
  function update(key: string, patch: Partial<AdditionRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function remove(key: string) {
    onChange(rows.filter((r) => r.key !== key))
  }

  function addAnother(typeName: string) {
    const lastIndex = rows.map((r) => r.typeName).lastIndexOf(typeName)
    const next = [...rows]
    next.splice(lastIndex + 1, 0, newRow(typeName))
    onChange(next)
  }

  if (types.length === 0 && rows.length === 0) {
    return <p style={mutedTextStyle}>עוד לא הוגדרו תוספות. אפשר להוסיף בהגדרות האישיות.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row) => {
        const type = types.find((t) => t.name === row.typeName)
        const custom = type?.allowsCustomName ?? false
        const copies = rows.filter((r) => r.typeName === row.typeName).length

        return (
          <div key={row.key}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 84px 56px', gap: 6, alignItems: 'center' }}>
              {custom ? (
                <input
                  value={row.customName}
                  onChange={(e) => update(row.key, { customName: e.target.value })}
                  placeholder={row.typeName}
                  aria-label={`שם התוספת (${row.typeName})`}
                  style={{ ...fieldInputStyle, minHeight: 40, padding: '4px 10px', fontSize: 15 }}
                />
              ) : (
                <span style={{ fontSize: 15, color: row.unknownType ? 'var(--danger)' : 'var(--text)' }}>
                  {row.typeName}
                </span>
              )}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={row.price}
                onChange={(e) => update(row.key, { price: e.target.value })}
                placeholder="מחיר"
                aria-label={`מחיר ${row.typeName}`}
                style={{ ...fieldInputStyle, minHeight: 40, padding: '4px 8px', fontSize: 15, textAlign: 'center' }}
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={row.quantity}
                onChange={(e) => update(row.key, { quantity: e.target.value })}
                aria-label={`כמות ${row.typeName}`}
                style={{ ...fieldInputStyle, minHeight: 40, padding: '4px 6px', fontSize: 15, textAlign: 'center' }}
              />
            </div>

            {row.unknownType && (
              <p style={{ fontSize: 12, color: 'var(--danger)', margin: '2px 0' }}>
                התוספת הזו כבר לא קיימת בהגדרות.{' '}
                <button type="button" onClick={() => remove(row.key)} style={linkButtonStyle}>
                  הסרה
                </button>
              </p>
            )}

            {custom && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => addAnother(row.typeName)} style={linkButtonStyle}>
                  + עוד {row.typeName}
                </button>
                {copies > 1 && (
                  <button type="button" onClick={() => remove(row.key)} style={linkButtonStyle}>
                    הסרה
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

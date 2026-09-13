import { apiFetch } from '../api'
import { nameInputStyle, cellInputStyle, statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'

export type NumberFieldConfig = {
  key: string
  label: string
  step?: string
}

type Values = Record<string, string>

function toValues(fields: NumberFieldConfig[], data: Record<string, number>): Values {
  const values: Values = {}
  for (const field of fields) {
    values[field.key] = String(data[field.key] ?? 0)
  }
  return values
}

type NumberFieldsFormProps = {
  title: string
  fields: NumberFieldConfig[]
  initialData: Record<string, number>
}

export function NumberFieldsForm({ title, fields, initialData }: NumberFieldsFormProps) {
  const initialValues = toValues(fields, initialData)

  async function save(values: Values) {
    const body: Record<string, number> = {}
    for (const field of fields) body[field.key] = Number(values[field.key]) || 0
    return apiFetch('/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const { value: values, setValue: setValues, status, hasChanges, undo } = useAutosaveSection(
    initialValues,
    save,
  )

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Section title={title} action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {fields.map((field, index) => (
          <div
            key={field.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              padding: '6px 0',
              borderBottom: index < fields.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ ...nameInputStyle, flex: 1, width: 'auto', padding: 0 }}>{field.label}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={field.step ?? '0.01'}
              value={values[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              aria-label={field.label}
              style={{ ...cellInputStyle, width: 80 }}
            />
          </div>
        ))}
      </div>

      {status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && (
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>
      )}
    </Section>
  )
}

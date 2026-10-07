import { apiFetch } from '../api'
import { statusTextStyle } from './formStyles'
import { Section, UndoButton } from './Section'
import { useAutosaveSection } from './useAutosaveSection'

async function savePrefix(prefix: string) {
  return apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testOrderPrefix: prefix.trim() }),
  })
}

type TestOrderPrefixFormProps = {
  initialPrefix: string
}

// Orders whose customer name starts with this text are test orders: they are numbered from 500
// instead of 1000, so they never mix with the real numbering.
export function TestOrderPrefixForm({ initialPrefix }: TestOrderPrefixFormProps) {
  const { value, setValue, status, hasChanges, undo } = useAutosaveSection(initialPrefix, savePrefix)

  return (
    <Section title="הזמנות בדיקה" action={<UndoButton hasChanges={hasChanges} onUndo={undo} />}>
      <p style={{ ...statusTextStyle, marginTop: 0, marginBottom: 8 }}>
        הזמנה ששם הלקוחה בה מתחיל בטקסט הזה תקבל מספר מסדרת הבדיקה (500 ומעלה). השאירי ריק כדי לכבות.
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="לדוגמה: בדיקה"
        aria-label="תחילית להזמנות בדיקה"
        style={inputStyle}
      />
      {status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {status === 'saved' && <p style={statusTextStyle}>נשמר אוטומטית.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  fontSize: 15,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text)',
}

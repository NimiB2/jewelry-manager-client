import { Section } from './Section'

// Fixed reference data — informational only, deliberately outside the
// pricing engine (decision 9 in the spec). Not editable, not stored in Settings.
const PURITY_ROWS = [
  { label: 'זהב', value: '10.4' },
  { label: 'כסף', value: '13.4' },
]

function RatioRow({ label, value, isLast }: { label: string; value: string; isLast: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '6px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--accent)' }}>{value}</span>
    </div>
  )
}

export function ConversionRatiosTable() {
  return (
    <Section title="יחסי המרה">
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>טוהר</p>
      <div>
        {PURITY_ROWS.map((row, i) => (
          <RatioRow key={row.label} {...row} isLast={i === PURITY_ROWS.length - 1} />
        ))}
      </div>
    </Section>
  )
}

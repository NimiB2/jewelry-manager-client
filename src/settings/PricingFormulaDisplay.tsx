import { Section } from './Section'
import { statusTextStyle } from './formStyles'

// Read-only — mirrors server/src/pricing/pricing-formula.ts exactly. The
// formula itself is fixed in code (not user-editable); this is just so she
// can see how the price is derived without opening the codebase.
const steps: { label: string; formula: string }[] = [
  { label: 'עלות המתכת', formula: 'משקל המתכת × עלות לגרם' },
  { label: 'עלות העבודה', formula: 'שעות עבודה × תעריף לשעה' },
  {
    label: 'סה"כ הוצאות ישירות',
    formula: 'עלות המתכת + עלות העבודה + עלות האבנים + עלויות ייצור נוספות + משלוח + אריזה',
  },
  { label: 'עלות כולל הוצאות קבועות', formula: 'סה"כ הוצאות ישירות × (1 + שיעור הוצאות קבועות)' },
  {
    label: 'מחיר ללא מע"מ',
    formula: 'עלות כולל הוצאות קבועות ÷ [(1 ÷ מקדם רווח) − שיעור סליקה × (1 + שיעור מע"מ)]',
  },
  { label: 'מחיר סופי ללקוח כולל מע"מ', formula: 'מחיר ללא מע"מ × (1 + שיעור מע"מ)' },
  { label: 'עלות הסליקה', formula: 'מחיר סופי ללקוח כולל מע"מ × שיעור סליקה' },
  { label: 'רווח תמחירי', formula: 'מחיר ללא מע"מ − עלות כולל הוצאות קבועות − עלות הסליקה' },
  { label: 'שיעור הרווח', formula: 'רווח תמחירי ÷ מחיר ללא מע"מ' },
]

export function PricingFormulaDisplay() {
  return (
    <Section title="נוסחת תמחור">
      <p style={{ ...statusTextStyle, marginTop: 0, marginBottom: 12 }}>
        קבועה בקוד ולא ניתנת לשינוי מכאן. מקדם הרווח, שיעור הסליקה והמע"מ שהיא
        משתמשת בהם ניתנים לעריכה למעלה — בטבלת החומרים ובכרטיס העמלות.
      </p>
      <div>
        {steps.map((step, index) => (
          <div
            key={step.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 16,
              padding: '7px 0',
              borderBottom: index < steps.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text)', flexShrink: 0 }}>
              <span style={{ color: 'var(--text-muted)' }}>{index + 1}.</span> {step.label}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              }}
            >
              {step.formula}
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

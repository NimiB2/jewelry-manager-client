import { formatMoney, formatPercent } from './format'
import type { PriceBreakdown } from './types'

// Plain number inside a formula: no currency, no thousands separator, trailing zeros trimmed.
function num(value: number): string {
  return String(Math.round(value * 10000) / 10000)
}

type Line = {
  label: string
  value: string
  // The formula in words, then the same formula with this product's real numbers.
  words?: string
  numbers?: string
  strong?: boolean
}

function buildLines(b: PriceBreakdown): Line[] {
  const denominator = `1 ÷ ${num(b.profitMultiplier)} − ${formatPercent(b.cardFeeRate)} × (1 + ${formatPercent(b.vatRate)})`

  return [
    {
      label: 'עלות מתכת',
      value: formatMoney(b.metalCost),
      words: 'משקל × מחיר לגרם',
      numbers: `${num(b.weight)} × ${num(b.pricePerGram)}`,
    },
    {
      label: `עבודה (${num(b.laborHours)} שעות)`,
      value: formatMoney(b.laborCost),
      words: 'שעות × תעריף שעתי',
      numbers: `${num(b.laborHours)} × ${num(b.laborHourRate)}`,
    },
    { label: 'תוספות', value: formatMoney(b.additionsCost), words: 'מחיר × כמות, לכל תוספת' },
    { label: 'אריזה ומשלוח', value: formatMoney(b.packagingAndShippingCost), words: 'מההגדרות' },
    {
      label: 'סה"כ עלות ישירה',
      value: formatMoney(b.directCosts),
      words: 'מתכת + עבודה + תוספות + אריזה',
      numbers: `${num(b.metalCost)} + ${num(b.laborCost)} + ${num(b.additionsCost)} + ${num(b.packagingAndShippingCost)}`,
    },
    {
      label: 'כולל הוצאות קבועות',
      value: formatMoney(b.costWithFixedExpenses),
      words: 'עלות ישירה × (1 + הוצאות קבועות)',
      numbers: `${num(b.directCosts)} × (1 + ${formatPercent(b.fixedExpenseRate)})`,
    },
    {
      label: 'מחיר לפני מע"מ',
      value: formatMoney(b.priceExclVat),
      words: 'עלות כולל קבועות ÷ (1 ÷ מקדם − סליקה × (1 + מע"מ))',
      numbers: `${num(b.costWithFixedExpenses)} ÷ (${denominator})`,
    },
    {
      label: 'מחיר סופי כולל מע"מ',
      value: formatMoney(b.recommendedPrice),
      words: 'לפני מע"מ × (1 + מע"מ)',
      numbers: `${num(b.priceExclVat)} × (1 + ${formatPercent(b.vatRate)})`,
      strong: true,
    },
    {
      label: 'עמלת סליקה',
      value: formatMoney(b.cardFeeCost),
      words: 'מחיר סופי × סליקה',
      numbers: `${num(b.recommendedPrice)} × ${formatPercent(b.cardFeeRate)}`,
    },
    {
      label: `רווח (${formatPercent(b.profitRate)})`,
      value: formatMoney(b.profit),
      words: 'לפני מע"מ − עלות כולל קבועות − סליקה',
      numbers: `${num(b.priceExclVat)} − ${num(b.costWithFixedExpenses)} − ${num(b.cardFeeCost)}`,
    },
  ]
}

type BreakdownListProps = {
  breakdown: PriceBreakdown
  maxHeight?: string
}

// The full calculation, one compact row per step: label and amount, with the formula (in words and
// with this product's real numbers) underneath in small type.
export function BreakdownList({ breakdown, maxHeight }: BreakdownListProps) {
  return (
    <div style={{ maxHeight, overflowY: maxHeight ? 'auto' : undefined }}>
      {buildLines(breakdown).map((line) => (
        <div key={line.label} style={rowStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: line.strong ? 700 : 500 }}>{line.label}</span>
            <span style={{ fontSize: 13, fontWeight: line.strong ? 700 : 500 }}>{line.value}</span>
          </div>
          {line.words && (
            <div style={formulaStyle}>
              {/* No LTR isolation on the numbers: they must flow right to left like the words,
                  so the first number lines up with the first word. */}
              {line.words}
              {line.numbers && ` = ${line.numbers}`}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  padding: '3px 0',
  borderBottom: '1px solid var(--border)',
}

const formulaStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.35,
  color: 'var(--text-muted)',
}

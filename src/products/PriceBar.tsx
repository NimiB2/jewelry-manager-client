import { useState } from 'react'
import { formatMoney, formatPercent } from './format'
import { errorTextStyle, linkButtonStyle, mutedTextStyle, primaryButtonStyle } from './productStyles'
import type { PriceBreakdown } from './types'

type PriceBarProps = {
  preview: { breakdown: PriceBreakdown | null; error: string | null; loading: boolean }
  hasInputs: boolean
  canSave: boolean
  saving: boolean
  saveError: string | null
  onSave: () => void
}

// Sticks to the bottom of the calculator: the live recommended price, an optional cost
// breakdown, and the save button.
export function PriceBar({ preview, hasInputs, canSave, saving, saveError, onSave }: PriceBarProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const b = preview.breakdown

  const lines: [string, string][] = b
    ? [
        ['עלות מתכת', formatMoney(b.metalCost)],
        [`עבודה (${b.laborHours} שעות)`, formatMoney(b.laborCost)],
        ['תוספות', formatMoney(b.additionsCost)],
        ['אריזה ומשלוח', formatMoney(b.packagingAndShippingCost)],
        ['סה"כ עלות ישירה', formatMoney(b.directCosts)],
        ['כולל הוצאות קבועות', formatMoney(b.costWithFixedExpenses)],
        ['מחיר לפני מע"מ', formatMoney(b.priceExclVat)],
        ['עמלת סליקה', formatMoney(b.cardFeeCost)],
        [`רווח (${formatPercent(b.profitRate)})`, formatMoney(b.profit)],
      ]
    : []

  return (
    <div style={barStyle}>
      {showBreakdown && b && (
        <dl
          style={{
            margin: '0 0 8px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '2px 12px',
            fontSize: 13,
            maxHeight: '32dvh',
            overflowY: 'auto',
          }}
        >
          {lines.map(([label, value]) => (
            <div key={label} style={{ display: 'contents' }}>
              <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
              <dd style={{ margin: 0, textAlign: 'left' }}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>מחיר מומלץ (כולל מע"מ)</span>
        <span style={{ fontSize: 24, fontWeight: 700, opacity: preview.loading ? 0.5 : 1 }}>
          {b ? formatMoney(b.recommendedPrice) : '—'}
        </span>
      </div>

      {preview.error && <p style={{ ...errorTextStyle, margin: '2px 0' }}>{preview.error}</p>}
      {!preview.error && !hasInputs && <p style={{ ...mutedTextStyle, margin: '2px 0' }}>בחרי חומר והזיני משקל כדי לראות מחיר.</p>}

      {b && (
        <button type="button" onClick={() => setShowBreakdown((v) => !v)} style={linkButtonStyle}>
          {showBreakdown ? 'הסתרת פירוט' : 'הצגת פירוט'}
        </button>
      )}

      {saveError && <p style={{ ...errorTextStyle, margin: '4px 0' }}>{saveError}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !canSave}
        style={{ ...primaryButtonStyle, width: '100%', marginTop: 6, opacity: saving || !canSave ? 0.6 : 1 }}
      >
        {saving ? 'שומר...' : 'שמירת מוצר'}
      </button>
    </div>
  )
}

const barStyle: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  marginInline: -16,
  marginTop: 16,
  padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
}

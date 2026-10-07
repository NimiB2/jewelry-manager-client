import { useState } from 'react'
import { BreakdownList } from './BreakdownList'
import { formatMoney } from './format'
import { errorTextStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from './productStyles'
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
// breakdown with its formulas, and the save button.
export function PriceBar({ preview, hasInputs, canSave, saving, saveError, onSave }: PriceBarProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const b = preview.breakdown

  return (
    <div style={barStyle}>
      {showBreakdown && b && (
        <div style={{ marginBottom: 8 }}>
          <BreakdownList breakdown={b} maxHeight="30dvh" />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>מחיר מומלץ (כולל מע"מ)</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', opacity: preview.loading ? 0.5 : 1 }}>
          {b ? formatMoney(b.recommendedPrice) : '—'}
        </span>
      </div>

      {preview.error && <p style={{ ...errorTextStyle, margin: '2px 0' }}>{preview.error}</p>}
      {!preview.error && !hasInputs && <p style={{ ...mutedTextStyle, margin: '2px 0' }}>בחרי חומר והזיני משקל כדי לראות מחיר.</p>}

      {saveError && <p style={{ ...errorTextStyle, margin: '4px 0' }}>{saveError}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {b && (
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            style={{ ...secondaryButtonStyle, flex: 1, fontSize: 16, fontWeight: 600 }}
          >
            {showBreakdown ? 'הסתרת פירוט' : 'הצגת פירוט'}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canSave}
          style={{ ...primaryButtonStyle, flex: 1, opacity: saving || !canSave ? 0.6 : 1 }}
        >
          {saving ? 'שומר...' : 'שמירת מוצר'}
        </button>
      </div>
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

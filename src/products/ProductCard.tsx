import { useState } from 'react'
import { apiJson } from '../api'
import { BreakdownList } from './BreakdownList'
import { discountedPrice, isBelowProfitFloor } from './discount'
import { formatMoney } from './format'
import { cardStyle, errorTextStyle, mutedTextStyle } from './productStyles'
import type { PricingMeta, Product } from './types'

type ProductCardProps = {
  product: Product
  meta: PricingMeta | null
  discountPercent: number
  onEdit: () => void
  onUpdated: (product: Product) => void
}

// Name and price first (scannable in a second). Three clear actions per product: see how the
// price is calculated, edit the site price in place, or edit the whole piece (weight, additions...).
export function ProductCard({ product, meta, discountPercent, onEdit, onUpdated }: ProductCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showCalc, setShowCalc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shownPrice = discountedPrice(product.sitePrice, discountPercent)
  const discounted = discountPercent > 0
  const belowFloor = isBelowProfitFloor(product, meta, shownPrice)
  const recommended = product.price?.recommendedPrice
  // The recommended price follows the settings; the site price only changes when she changes it.
  const gap = recommended === undefined ? 0 : Math.round(recommended - product.sitePrice)

  function startEdit() {
    setDraft(String(product.sitePrice))
    setError(null)
    setEditing(true)
  }

  async function saveEdit() {
    const value = Number(draft)
    if (draft === '' || !Number.isFinite(value) || value < 0) {
      setError('הזיני מחיר תקין')
      return
    }
    setSaving(true)
    try {
      const updated = await apiJson<Product>(`/products/${product.id}/site-price`, {
        method: 'PATCH',
        body: JSON.stringify({ sitePrice: value }),
      })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{product.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {product.type} · {product.material} · {product.weight} גרם
          </div>
          {belowFloor && <div style={{ ...errorTextStyle, fontSize: 12, marginTop: 2 }}>מתחת לרצפת הרווח</div>}
          {product.priceError && <div style={{ ...errorTextStyle, fontSize: 12, marginTop: 2 }}>{product.priceError}</div>}
        </div>

        {/* The site price is the main number; the recommended price is a small tag under it. */}
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>מחיר באתר</div>
          {/* Always neutral: red is reserved for warnings and for the recommended tag when it is higher. */}
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--text)' }}>
            {formatMoney(shownPrice)}
          </div>
          {discounted && (
            <div style={{ ...mutedTextStyle, textDecoration: 'line-through' }}>{formatMoney(product.sitePrice)}</div>
          )}
          {recommended !== undefined && (
            <span
              title={gap === 0 ? undefined : gap > 0 ? `המחיר באתר נמוך מהמומלץ ב-${formatMoney(gap)}` : `המחיר באתר גבוה מהמומלץ ב-${formatMoney(-gap)}`}
              style={{ ...recommendedTagStyle, ...(gap > 0 ? recommendedLowStyle : null) }}
            >
              מומלץ {formatMoney(recommended)}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {product.price && (
          <button type="button" onClick={() => setShowCalc((v) => !v)} aria-expanded={showCalc} style={actionButtonStyle}>
            {showCalc ? 'הסתרת חישוב' : 'חישוב'}
          </button>
        )}
        <button type="button" onClick={startEdit} style={actionButtonStyle}>
          עריכת מחיר
        </button>
        <button type="button" onClick={onEdit} style={actionButtonStyle}>
          עריכת תכשיט
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              aria-label="מחיר באתר"
              style={editInputStyle}
            />
            <button type="button" onClick={saveEdit} disabled={saving} style={saveButtonStyle}>
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={cancelButtonStyle}>
              ביטול
            </button>
          </div>
          {recommended !== undefined && (
            <button
              type="button"
              onClick={() => setDraft(String(Math.round(recommended)))}
              style={{ ...cancelButtonStyle, color: 'var(--accent)', padding: '6px 0' }}
            >
              שימוש במחיר המומלץ ({formatMoney(Math.round(recommended))})
            </button>
          )}
          {error && <p style={{ ...errorTextStyle, marginTop: 4 }}>{error}</p>}
        </div>
      )}

      {showCalc && product.price && (
        <div style={{ marginTop: 8 }}>
          <BreakdownList breakdown={product.price} />
        </div>
      )}
    </article>
  )
}

// Small tag: colored enough to notice, but clearly secondary to the site price. Red when the
// site price is below the recommendation.
const recommendedTagStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 2,
  padding: '1px 8px',
  borderRadius: 10,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 12,
  fontWeight: 600,
}

const recommendedLowStyle: React.CSSProperties = {
  background: 'var(--danger-bg)',
  color: 'var(--danger)',
}

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 36,
  padding: '0 6px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--accent)',
  fontSize: 13,
  cursor: 'pointer',
}

const editInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 40,
  padding: '6px 10px',
  fontSize: 16,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text)',
}

const saveButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 14px',
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 15,
  cursor: 'pointer',
}

const cancelButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 14,
  cursor: 'pointer',
}

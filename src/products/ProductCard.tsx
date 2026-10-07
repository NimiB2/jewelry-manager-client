import { useState } from 'react'
import { apiJson } from '../api'
import { discountedPrice, isBelowProfitFloor } from './discount'
import { formatMoney } from './format'
import { cardStyle, errorTextStyle, linkButtonStyle, mutedTextStyle } from './productStyles'
import type { PricingMeta, Product } from './types'

type ProductCardProps = {
  product: Product
  meta: PricingMeta | null
  discountPercent: number
  onOpen: () => void
  onUpdated: (product: Product) => void
}

// Name and price first (scannable in a second); type/material are secondary. The price can be
// edited in place without opening the calculator.
export function ProductCard({ product, meta, discountPercent, onOpen, onUpdated }: ProductCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shownPrice = discountedPrice(product.sitePrice, discountPercent)
  const discounted = discountPercent > 0
  const belowFloor = isBelowProfitFloor(product, meta, shownPrice)
  const recommended = product.price?.recommendedPrice

  function startEdit() {
    setDraft(String(product.sitePrice))
    setError(null)
    setEditing(true)
  }

  async function saveEdit() {
    const value = Number(draft)
    if (!Number.isFinite(value) || value < 0) {
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
        <button type="button" onClick={onOpen} style={openButtonStyle} aria-label={`פתיחת ${product.name}`}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{product.name}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {product.type} · {product.material}
          </span>
        </button>

        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: belowFloor ? 'var(--danger)' : 'var(--text)' }}>
            {formatMoney(shownPrice)}
          </div>
          {discounted && (
            <div style={{ ...mutedTextStyle, textDecoration: 'line-through' }}>{formatMoney(product.sitePrice)}</div>
          )}
        </div>
      </div>

      {belowFloor && <p style={{ ...errorTextStyle, marginTop: 6 }}>מתחת לרצפת הרווח</p>}
      {product.priceError && <p style={{ ...errorTextStyle, marginTop: 6 }}>{product.priceError}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={mutedTextStyle}>{recommended !== undefined ? `מחיר מומלץ ${formatMoney(recommended)}` : ''}</span>
        {!editing && (
          <button type="button" onClick={startEdit} style={linkButtonStyle}>
            עריכת מחיר
          </button>
        )}
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
          {error && <p style={{ ...errorTextStyle, marginTop: 4 }}>{error}</p>}
        </div>
      )}
    </article>
  )
}

const openButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  border: 'none',
  background: 'transparent',
  padding: 0,
  textAlign: 'right',
  cursor: 'pointer',
  flex: 1,
  minWidth: 0,
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

import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '../api'
import { formatMoney } from '../products/format'
import { fieldInputStyle, mutedTextStyle } from '../products/productStyles'
import type { Collection, Product, ProductsList } from '../products/types'

type ProductPickerProps = {
  onPick: (product: Product) => void
  onClose: () => void
}

// A window in the middle of the screen with the catalog: type a few letters, tap a product, it
// joins the order. (Not stuck to the bottom edge, where the list looked cut off.)
export function ProductPicker({ onPick, onClose }: ProductPickerProps) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [customOrderId, setCustomOrderId] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([apiJson<ProductsList>('/products'), apiJson<Collection[]>('/collections')])
      .then(([list, collections]) => {
        setProducts(list.products)
        setCustomOrderId(collections.find((c) => c.key === 'customOrder')?.id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (products ?? []).filter((p) => {
      // One-off custom items stay out of the way unless she searches for them.
      const onlyCustom = customOrderId !== undefined && p.collectionIds.every((id) => id === customOrderId)
      if (onlyCustom && !query) return false
      return !query || p.name.toLowerCase().includes(query)
    })
  }, [products, customOrderId, search])

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="בחירת מוצר" onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש מוצר לפי שם"
            aria-label="חיפוש מוצר"
            style={{ ...fieldInputStyle, flex: 1 }}
          />
          <button type="button" onClick={onClose} style={closeStyle}>
            סגירה
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {error && <p style={{ color: 'var(--danger)' }}>שגיאה בטעינת המוצרים: {error}</p>}
          {!products && !error && <p style={mutedTextStyle}>טוען מוצרים...</p>}
          {products && visible.length === 0 && <p style={{ ...mutedTextStyle, padding: 12 }}>לא נמצאו מוצרים.</p>}

          {visible.map((product) => (
            <button key={product.id} type="button" onClick={() => onPick(product)} style={rowStyle}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{product.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {product.type} · {product.material}
                </span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>{formatMoney(product.sitePrice)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // A little extra room below, so the window sits slightly above the exact middle.
  padding: '16px 16px 12vh',
}

const sheetStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  maxHeight: 'min(70dvh, 560px)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  borderRadius: 16,
  padding: 12,
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
}

const closeStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 15,
  cursor: 'pointer',
}

const rowStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  minHeight: 52,
  padding: '8px 12px',
  marginBottom: 6,
  border: 'none',
  borderRadius: 10,
  background: 'var(--surface)',
  cursor: 'pointer',
}

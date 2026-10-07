import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '../api'
import { PlusIcon, SearchIcon } from '../icons/NavIcons'
import { navigate } from '../shell/useRoute'
import { ProductCard } from './ProductCard'
import { cardStyle, errorTextStyle, fieldInputStyle, mutedTextStyle, primaryButtonStyle } from './productStyles'
import type { Collection, Product, ProductsList } from './types'

const CUSTOM_ORDER_KEY = 'customOrder'

export function ProductsPage() {
  const [data, setData] = useState<ProductsList | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('')
  const [discount, setDiscount] = useState('')

  useEffect(() => {
    Promise.all([apiJson<ProductsList>('/products'), apiJson<Collection[]>('/collections')])
      .then(([list, cols]) => {
        setData(list)
        setCollections(cols)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const customOrderId = collections.find((c) => c.key === CUSTOM_ORDER_KEY)?.id

  const visible = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()

    return data.products.filter((p) => {
      // The catalog hides one-off "custom order" items unless that collection is picked explicitly.
      const onlyCustomOrder = customOrderId !== undefined && p.collectionIds.every((id) => id === customOrderId)
      if (onlyCustomOrder && collectionFilter !== customOrderId) return false

      if (query && !p.name.toLowerCase().includes(query)) return false
      if (typeFilter && p.type !== typeFilter) return false
      if (materialFilter && p.material !== materialFilter) return false
      if (collectionFilter && !p.collectionIds.includes(collectionFilter)) return false
      return true
    })
  }, [data, search, typeFilter, materialFilter, collectionFilter, customOrderId])

  const types = useMemo(() => [...new Set((data?.products ?? []).map((p) => p.type))].sort(), [data])
  const materials = useMemo(() => [...new Set((data?.products ?? []).map((p) => p.material))].sort(), [data])

  function replaceProduct(updated: Product) {
    setData((prev) =>
      prev ? { ...prev, products: prev.products.map((p) => (p.id === updated.id ? updated : p)) } : prev,
    )
  }

  const discountPercent = Math.min(100, Math.max(0, Number(discount) || 0))

  if (error) {
    return (
      <div className="screen">
        <h1>מוצרים</h1>
        <p style={errorTextStyle}>שגיאה בטעינת המוצרים: {error}</p>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="screen">
        <h1>מוצרים</h1>
        <p style={mutedTextStyle}>טוען מוצרים...</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>מוצרים</h1>

      <div style={{ position: 'relative', marginBottom: 8 }}>
        <span style={searchIconStyle}>
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מוצר לפי שם"
          aria-label="חיפוש מוצר לפי שם"
          style={{ ...fieldInputStyle, minHeight: 50, paddingInlineStart: 40, fontSize: 17 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginBottom: 10 }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="סינון לפי סוג" style={filterStyle}>
          <option value="">כל הסוגים</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
          aria-label="סינון לפי חומר"
          style={filterStyle}
        >
          <option value="">כל החומרים</option>
          {materials.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={collectionFilter}
          onChange={(e) => setCollectionFilter(e.target.value)}
          aria-label="סינון לפי קולקציה"
          style={filterStyle}
        >
          <option value="">כל הקולקציות</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {data.products.length > 0 && (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <label htmlFor="discount" style={{ fontSize: 14, flex: 1 }}>
            סימולטור הנחה
            <span style={{ ...mutedTextStyle, display: 'block' }}>לתצוגה בלבד, המחירים האמיתיים לא משתנים</span>
          </label>
          <input
            id="discount"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            style={{ ...fieldInputStyle, width: 80, textAlign: 'center' }}
          />
          <span style={{ fontSize: 15 }}>%</span>
        </div>
      )}

      {data.products.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>עוד אין מוצרים</p>
          <p style={{ ...mutedTextStyle, marginBottom: 14 }}>מוצר חדש נוצר במחשבון, וממנו מחושב המחיר.</p>
          <button type="button" onClick={() => navigate('/products/new')} style={primaryButtonStyle}>
            הוספת מוצר
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p style={{ ...mutedTextStyle, textAlign: 'center', padding: 16 }}>לא נמצאו מוצרים שמתאימים לסינון.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 90 }}>
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              meta={data.pricing}
              discountPercent={discountPercent}
              onOpen={() => navigate(`/products/${product.id}`)}
              onUpdated={replaceProduct}
            />
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => navigate('/products/new')} aria-label="הוספת מוצר חדש">
        <PlusIcon />
      </button>
    </div>
  )
}

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  insetInlineStart: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  display: 'flex',
  pointerEvents: 'none',
}

const filterStyle: React.CSSProperties = {
  ...fieldInputStyle,
  minHeight: 40,
  padding: '4px 8px',
  fontSize: 14,
}

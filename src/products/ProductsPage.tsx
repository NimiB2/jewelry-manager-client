import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '../api'
import { PlusIcon, SearchIcon } from '../icons/NavIcons'
import { subItemsOf } from '../shell/navItems'
import { SubNav } from '../shell/SubNav'
import { navigate } from '../shell/useRoute'
import { ProductCard } from './ProductCard'
import { cardStyle, errorTextStyle, fieldInputStyle, mutedTextStyle, primaryButtonStyle } from './productStyles'
import type { Collection, Product, ProductsList } from './types'

const CUSTOM_ORDER_KEY = 'customOrder'

// Material filter values: a material name to show only it, or "not:<name>" to show everything except it.
const EXCLUDE_PREFIX = 'not:'

type ProductsPageProps = {
  // Open already filtered to the collection with this name (the rings shortcuts).
  collectionName?: string | null
}

export function ProductsPage({ collectionName = null }: ProductsPageProps) {
  const [data, setData] = useState<ProductsList | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [discountPresets, setDiscountPresets] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('')
  const [discount, setDiscount] = useState('')

  // Reads everything fresh. Prices follow the settings, so this also runs when she comes back to the
  // tab or the app after changing something elsewhere.
  function load() {
    Promise.all([
      apiJson<ProductsList>('/products'),
      apiJson<Collection[]>('/collections'),
      apiJson<{ data: { discountPresets?: number[] } }>('/settings').catch(() => null),
    ])
      .then(([list, cols, settings]) => {
        setData(list)
        setCollections(cols)
        if (collectionName) setCollectionFilter(cols.find((c) => c.name === collectionName)?.id ?? '')
        setDiscountPresets(settings?.data.discountPresets ?? [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(() => {
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (materialFilter.startsWith(EXCLUDE_PREFIX)) {
        if (p.material === materialFilter.slice(EXCLUDE_PREFIX.length)) return false
      } else if (materialFilter && p.material !== materialFilter) return false
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{collectionName ?? 'מוצרים'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => navigate('/shopify')} style={importButtonStyle}>
            ייבוא מהחנות
          </button>
          <button type="button" onClick={() => navigate('/products/new')} style={{ ...primaryButtonStyle, minHeight: 40 }}>
            + הוספת מוצר
          </button>
        </div>
      </div>

      <SubNav items={subItemsOf('products', { page: 'products', collection: collectionName })} />

      {collectionName && data && !collections.some((c) => c.name === collectionName) && (
        <p style={{ ...mutedTextStyle, marginBottom: 10 }}>
          אין קולקציה בשם "{collectionName}". אפשר ליצור אותה בהגדרות ולשייך אליה מוצרים.
        </p>
      )}

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
          <optgroup label="הכל חוץ מ...">
            {materials.map((m) => (
              <option key={`not-${m}`} value={EXCLUDE_PREFIX + m}>
                בלי {m}
              </option>
            ))}
          </optgroup>
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
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

          {discountPresets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setDiscount('')} aria-pressed={discountPercent === 0} style={chipStyle(discountPercent === 0)}>
                ללא
              </button>
              {discountPresets.map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setDiscount(discountPercent === percent ? '' : String(percent))}
                  aria-pressed={discountPercent === percent}
                  style={chipStyle(discountPercent === percent)}
                >
                  {percent}%
                </button>
              ))}
            </div>
          )}
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
              onEdit={() => navigate(`/products/${product.id}`)}
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

function chipStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: 36,
    minWidth: 56,
    padding: '0 14px',
    borderRadius: 18,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: 15,
    cursor: 'pointer',
  }
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

const importButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiJson } from '../api'
import { BackIcon } from '../icons/NavIcons'
import { ConfirmDeleteButton } from '../settings/ConfirmDeleteButton'
import { navigate } from '../shell/useRoute'
import { type AdditionRow, newRow, rowsFromProduct, rowsToAdditions } from './additionRowHelpers'
import { AdditionRows } from './AdditionRows'
import { PriceBar } from './PriceBar'
import {
  cardStyle,
  errorTextStyle,
  fieldInputStyle,
  fieldLabelStyle,
  linkButtonStyle,
  mutedTextStyle,
} from './productStyles'
import type { Collection, PriceBreakdown, Product, ProductsList, SaveProductBody } from './types'

type SettingsForCalculator = {
  data: {
    materials: Record<string, unknown>
    productAdditionTypes: { name: string; allowsCustomName: boolean }[]
  }
}

type Preview = { breakdown: PriceBreakdown | null; error: string | null; loading: boolean }

const DEFAULT_TYPES = ['טבעת', 'שרשרת', 'עגילים', 'צמיד', 'תליון']

type ProductCalculatorProps = {
  productId: string | null
  // Opened from an order to make a one-off item: starts in the "custom order" collection and goes
  // back to that order afterwards.
  custom: boolean
  returnTo: string | null
}

// The only way to create or edit a product. The price shown comes from the server on every
// change (the formula lives in one place), so what she sees is exactly what gets calculated.
export function ProductCalculator({ productId, custom, returnTo }: ProductCalculatorProps) {
  const isNew = productId === null

  const [settings, setSettings] = useState<SettingsForCalculator | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [typeSuggestions, setTypeSuggestions] = useState<string[]>(DEFAULT_TYPES)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const [type, setType] = useState('')
  const [material, setMaterial] = useState('')
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [extraHours, setExtraHours] = useState('')
  const [rows, setRows] = useState<AdditionRow[]>([])
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [sitePrice, setSitePrice] = useState('')
  const sitePriceTouched = useRef(!isNew)

  const [preview, setPreview] = useState<Preview>({ breakdown: null, error: null, loading: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const requests = [
      apiJson<SettingsForCalculator>('/settings'),
      apiJson<Collection[]>('/collections'),
      isNew ? Promise.resolve(null) : apiJson<Product>(`/products/${productId}`),
      apiJson<ProductsList>('/products').catch(() => null),
    ] as const

    Promise.all(requests)
      .then(([loadedSettings, loadedCollections, product, list]) => {
        setSettings(loadedSettings)
        setCollections(loadedCollections)
        const existingTypes = (list?.products ?? []).map((p) => p.type)
        setTypeSuggestions([...new Set([...DEFAULT_TYPES, ...existingTypes])])

        const types = loadedSettings.data.productAdditionTypes
        if (product) {
          setType(product.type)
          setMaterial(product.material)
          setName(product.name)
          setWeight(String(product.weight))
          setExtraHours(product.additionalWorkHours ? String(product.additionalWorkHours) : '')
          setSitePrice(String(product.sitePrice))
          setCollectionIds(product.collectionIds)
          setRows(rowsFromProduct(types, product.additions))
        } else {
          setRows(types.map((t) => newRow(t.name)))
          const start = loadedCollections.find((c) => c.key === (custom ? 'customOrder' : 'general'))
          setCollectionIds(start ? [start.id] : [])
        }
        setReady(true)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const types = settings?.data.productAdditionTypes ?? []
  const materialNames = Object.keys(settings?.data.materials ?? {})
  const weightNumber = Number(weight)
  const additions = useMemo(() => rowsToAdditions(rows), [rows])

  // Live price: ask the server whenever an input that affects the price changes.
  const previewKey = JSON.stringify([material, weightNumber, extraHours, additions])
  const requestCounter = useRef(0)
  useEffect(() => {
    if (!ready) return
    if (!material || weight === '' || !(weightNumber >= 0)) {
      setPreview({ breakdown: null, error: null, loading: false })
      return
    }

    const requestId = ++requestCounter.current
    setPreview((prev) => ({ ...prev, loading: true }))
    const timer = setTimeout(() => {
      apiJson<PriceBreakdown>('/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          material,
          weight: weightNumber,
          additionalWorkHours: Number(extraHours) || 0,
          additions,
        }),
      })
        .then((breakdown) => {
          if (requestId !== requestCounter.current) return
          setPreview({ breakdown, error: null, loading: false })
          if (!sitePriceTouched.current) setSitePrice(String(Math.round(breakdown.recommendedPrice)))
        })
        .catch((err) => {
          if (requestId !== requestCounter.current) return
          setPreview({ breakdown: null, error: err instanceof Error ? err.message : String(err), loading: false })
        })
    }, 350)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, ready])

  function toggleCollection(id: string) {
    setCollectionIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function validate(): string | null {
    if (!type.trim()) return 'בחרי או הזיני סוג מוצר'
    if (!name.trim()) return 'הזיני שם למוצר'
    if (!material) return 'בחרי חומר'
    if (weight === '' || !(weightNumber >= 0)) return 'הזיני משקל (אפשר 0)'
    const price = Number(sitePrice)
    if (sitePrice === '' || !Number.isFinite(price) || price < 0) return 'הזיני מחיר באתר'
    if (rows.some((r) => r.unknownType)) return 'יש תוספת שכבר לא קיימת בהגדרות — הסירי אותה כדי לשמור'
    for (const row of rows) {
      const included = Number(row.price) > 0
      const needsName = types.find((t) => t.name === row.typeName)?.allowsCustomName
      if (included && needsName && !row.customName.trim()) return `הזיני שם לתוספת "${row.typeName}"`
    }
    return null
  }

  async function save() {
    const problem = validate()
    if (problem) {
      setSaveError(problem)
      return
    }

    const body: SaveProductBody = {
      type: type.trim(),
      name: name.trim(),
      material,
      weight: weightNumber,
      additionalWorkHours: Number(extraHours) || 0,
      sitePrice: Number(sitePrice),
      additions,
      collectionIds,
    }

    setSaving(true)
    setSaveError(null)
    try {
      const saved = await apiJson<Product>(isNew ? '/products' : `/products/${productId}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(body),
      })
      navigate(returnTo ? `${returnTo}?restore=1&addProduct=${saved.id}` : '/products')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'השמירה נכשלה')
      setSaving(false)
    }
  }

  async function remove() {
    try {
      await apiJson<void>(`/products/${productId}`, { method: 'DELETE' })
      navigate('/products')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'המחיקה נכשלה')
    }
  }

  if (loadError) {
    return (
      <div className="screen">
        <p style={errorTextStyle}>שגיאה בטעינה: {loadError}</p>
        <button type="button" onClick={() => navigate('/products')} style={linkButtonStyle}>
          חזרה למוצרים
        </button>
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="screen">
        <p style={mutedTextStyle}>טוען...</p>
      </div>
    )
  }

  const materialMissing = material !== '' && !materialNames.includes(material)

  return (
    <div className="screen" style={{ paddingBottom: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => navigate(returnTo ? `${returnTo}?restore=1` : '/products')}
          aria-label={returnTo ? 'חזרה להזמנה' : 'חזרה למוצרים'}
          style={backButtonStyle}
        >
          <BackIcon />
        </button>
        <h1 style={{ flex: 1, margin: 0 }}>{isNew ? (custom ? 'פריט אישי להזמנה' : 'מוצר חדש') : name || 'עריכת מוצר'}</h1>
        {!isNew && <ConfirmDeleteButton onConfirm={remove} ariaLabel="מחיקת המוצר" />}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label htmlFor="product-type" style={fieldLabelStyle}>
              סוג
            </label>
            <input
              id="product-type"
              list="product-type-suggestions"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="לדוגמה: טבעת"
              style={fieldInputStyle}
            />
            <datalist id="product-type-suggestions">
              {typeSuggestions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="product-material" style={fieldLabelStyle}>
              חומר
            </label>
            <select id="product-material" value={material} onChange={(e) => setMaterial(e.target.value)} style={fieldInputStyle}>
              <option value="">בחירה...</option>
              {materialMissing && <option value={material}>{material} (לא קיים בהגדרות)</option>}
              {materialNames.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Progressive disclosure: the rest appears once a material is chosen. */}
        {material && (
          <>
            <div>
              <label htmlFor="product-name" style={fieldLabelStyle}>
                שם המוצר
              </label>
              <input id="product-name" value={name} onChange={(e) => setName(e.target.value)} style={fieldInputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label htmlFor="product-weight" style={fieldLabelStyle}>
                  משקל (גרם)
                </label>
                <input
                  id="product-weight"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  style={fieldInputStyle}
                />
              </div>
              <div>
                <label htmlFor="product-hours" style={fieldLabelStyle}>
                  שעות עבודה נוספות
                </label>
                <input
                  id="product-hours"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.25"
                  value={extraHours}
                  onChange={(e) => setExtraHours(e.target.value)}
                  placeholder="0"
                  style={fieldInputStyle}
                />
              </div>
            </div>

            <section style={cardStyle}>
              <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>תוספות</h2>
              <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 8 }}>ממלאים מחיר רק במה שרלוונטי למוצר.</p>
              <AdditionRows rows={rows} types={types} onChange={setRows} />
            </section>

            <section style={cardStyle}>
              <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>קולקציות</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {collections.map((c) => {
                  const on = collectionIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollection(c.id)}
                      aria-pressed={on}
                      style={{
                        minHeight: 36,
                        padding: '0 12px',
                        borderRadius: 18,
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                        background: on ? 'var(--accent-bg)' : 'var(--surface)',
                        color: on ? 'var(--accent)' : 'var(--text)',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </section>

            <div>
              <label htmlFor="product-site-price" style={fieldLabelStyle}>
                מחיר באתר (₪)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="product-site-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={sitePrice}
                  onChange={(e) => {
                    sitePriceTouched.current = true
                    setSitePrice(e.target.value)
                  }}
                  style={{ ...fieldInputStyle, flex: 1 }}
                />
                {preview.breakdown && (
                  <button
                    type="button"
                    style={linkButtonStyle}
                    onClick={() => {
                      sitePriceTouched.current = false
                      setSitePrice(String(Math.round(preview.breakdown!.recommendedPrice)))
                    }}
                  >
                    שימוש במחיר המומלץ
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <PriceBar
        preview={preview}
        canSave={Boolean(material)}
        saving={saving}
        saveError={saveError}
        onSave={save}
        hasInputs={Boolean(material) && weight !== '' && weightNumber >= 0}
      />
    </div>
  )
}

const backButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: 'none',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

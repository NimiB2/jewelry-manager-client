import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, apiJson } from '../api'
import { ProductPicker } from '../orders/ProductPicker'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import type { ShopifyVariant } from '../products/types'
import { navigate } from '../shell/useRoute'

type ShopifyStatus = { catalogConfigured: boolean; ordersConfigured: boolean }

type Candidate = { productId: string; name: string; sitePrice: number; reason: 'name' | 'price' }

type StoreProduct = {
  externalId: string
  title: string
  lowestPrice: number
  variants: ShopifyVariant[]
  // linked: already tied · match: one product has exactly this name · candidates: some look right · none
  status: 'linked' | 'match' | 'candidates' | 'none'
  linkedProductId: string | null
  linkedProductName: string | null
  candidates: Candidate[]
}

type Conflict = { externalId: string; productId: string; message: string }

type Filter = 'todo' | 'linked' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todo', label: 'דורשים טיפול' },
  { value: 'linked', label: 'מקושרים' },
  { value: 'all', label: 'הכל' },
]

// The store's products next to the catalog. She ties each one to a product she already has, or adds the
// missing ones in a click, so an incoming order is recognised from the very first one.
export function ShopifyImportPage() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null)
  const [items, setItems] = useState<StoreProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('todo')
  const [picking, setPicking] = useState<string | null>(null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [busy, setBusy] = useState(false)
  const [bulk, setBulk] = useState<'link' | 'create' | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const current = await apiJson<ShopifyStatus>('/shopify/status')
      setStatus(current)
      setItems(current.catalogConfigured ? await apiJson<StoreProduct[]>('/shopify/products') : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setItems((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function link(externalId: string, productId: string, replace = false) {
    setBusy(true)
    setConflict(null)
    setError(null)
    setNotice(null)
    try {
      await apiJson<void>('/shopify/products/link', {
        method: 'POST',
        body: JSON.stringify({ externalId, productId, replace }),
      })
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setConflict({ externalId, productId, message: err.message })
      else setError(err instanceof Error ? err.message : 'הקישור נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function create(externalIds: string[]) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await apiJson<{ created: number; skipped: string[] }>('/shopify/products/create', {
        method: 'POST',
        body: JSON.stringify({ externalIds }),
      })
      setNotice(
        result.created > 0
          ? `נוספו ${result.created} מוצרים. הם מסומנים "חסרים פרטים" עד שתשלימי סוג וחומר.`
          : 'לא נוסף מוצר חדש.',
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההוספה נכשלה')
    } finally {
      setBusy(false)
      setBulk(null)
    }
  }

  // Every clear match (exactly one product with this name) is confirmed one by one; a clash stops the loop.
  async function linkAllMatches(matches: StoreProduct[]) {
    setBusy(true)
    setError(null)
    setNotice(null)
    let done = 0
    try {
      for (const item of matches) {
        await apiJson<void>('/shopify/products/link', {
          method: 'POST',
          body: JSON.stringify({ externalId: item.externalId, productId: item.candidates[0].productId, replace: false }),
        })
        done++
      }
      setNotice(`קושרו ${done} מוצרים.`)
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'הקישור נכשל'} (קושרו ${done} לפני כן)`)
    } finally {
      await load()
      setBusy(false)
      setBulk(null)
    }
  }

  const counts = useMemo(() => {
    const all = items ?? []
    return {
      linked: all.filter((i) => i.status === 'linked').length,
      todo: all.filter((i) => i.status !== 'linked').length,
      matches: all.filter((i) => i.status === 'match'),
      missing: all.filter((i) => i.status === 'none'),
    }
  }, [items])

  const order = { none: 0, candidates: 1, match: 2, linked: 3 } as const
  const visible = (items ?? [])
    .filter((i) => (filter === 'all' ? true : filter === 'linked' ? i.status === 'linked' : i.status !== 'linked'))
    .sort((a, b) => order[a.status] - order[b.status] || a.title.localeCompare(b.title))

  if (!items && !error) {
    return (
      <div className="screen">
        <h1>ייבוא מהחנות</h1>
        <p style={mutedTextStyle}>טוען מוצרים מהחנות...</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>ייבוא מהחנות</h1>
        <button type="button" onClick={() => navigate('/products')} style={secondaryButtonStyle}>
          חזרה למוצרים
        </button>
      </div>
      <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
        קוראים את המוצרים שבחנות ומקשרים כל אחד למוצר שכבר קיים אצלך. אין כתיבה לחנות: המערכת רק קוראת.
      </p>

      {status && !status.catalogConfigured && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>החנות עדיין לא מחוברת</p>
          <p style={{ ...mutedTextStyle, margin: 0 }}>
            כשכתובת החנות והמפתח יוגדרו בשרת, המוצרים יופיעו כאן. אין צורך לעשות משהו במסך הזה לפני כן.
          </p>
        </div>
      )}

      {error && <p style={errorTextStyle}>{error}</p>}
      {notice && <p style={{ color: 'var(--success)', fontSize: 14 }}>{notice}</p>}

      {status?.catalogConfigured && items && (
        <>
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 15 }}>
              <b>{counts.linked}</b> מקושרים · <b>{counts.todo}</b> דורשים טיפול · סה"כ {items.length} מוצרים פעילים בחנות
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {counts.matches.length > 0 &&
                (bulk === 'link' ? (
                  <ConfirmRow
                    text={`לקשר ${counts.matches.length} מוצרים שנמצאה להם התאמה בשם?`}
                    busy={busy}
                    onYes={() => void linkAllMatches(counts.matches)}
                    onNo={() => setBulk(null)}
                  />
                ) : (
                  <button type="button" disabled={busy} onClick={() => setBulk('link')} style={secondaryButtonStyle}>
                    קישור כל ההתאמות הברורות ({counts.matches.length})
                  </button>
                ))}

              {counts.missing.length > 0 &&
                (bulk === 'create' ? (
                  <ConfirmRow
                    text={`להוסיף ${counts.missing.length} מוצרים חדשים, רק עם שם ומחיר?`}
                    busy={busy}
                    onYes={() => void create(counts.missing.map((m) => m.externalId))}
                    onNo={() => setBulk(null)}
                  />
                ) : (
                  <button type="button" disabled={busy} onClick={() => setBulk('create')} style={secondaryButtonStyle}>
                    הוספת כל החסרים ({counts.missing.length})
                  </button>
                ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {FILTERS.map((f) => (
              <button key={f.value} type="button" onClick={() => setFilter(f.value)} aria-pressed={filter === f.value} style={chipStyle(filter === f.value)}>
                {f.label}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '24px 16px' }}>
              <p style={{ fontWeight: 600, margin: 0 }}>{filter === 'todo' ? 'הכול מקושר' : 'אין מוצרים להצגה'}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 90 }}>
            {visible.map((item) => (
              <article key={item.externalId} style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{item.title}</div>

                {/* Every price the store offers for it (one per size/option), so nothing is hidden. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {item.variants.map((v, i) => (
                    <span key={i} style={variantChipStyle}>
                      {v.title ? `${v.title} · ` : ''}
                      {formatMoney(v.price)}
                    </span>
                  ))}
                </div>

                {item.status === 'linked' && (
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--success)' }}>✓ מקושר ל-{item.linkedProductName}</p>
                )}

                {item.status !== 'linked' && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {item.candidates.map((c) => (
                      <div key={c.productId} style={candidateRowStyle}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>{' '}
                          <span style={mutedTextStyle}>
                            · {formatMoney(c.sitePrice)} · {c.reason === 'name' ? 'אותו שם' : 'אותו מחיר'}
                          </span>
                        </span>
                        <button type="button" disabled={busy} onClick={() => void link(item.externalId, c.productId)} style={smallButtonStyle}>
                          קישור
                        </button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" disabled={busy} onClick={() => setPicking(item.externalId)} style={secondaryButtonStyle}>
                        בחירת מוצר מהרשימה
                      </button>
                      <button type="button" disabled={busy} onClick={() => void create([item.externalId])} style={secondaryButtonStyle}>
                        הוספה כמוצר חדש
                      </button>
                    </div>
                  </div>
                )}

                {conflict?.externalId === item.externalId && (
                  <div role="alert" style={warningStyle}>
                    <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{conflict.message}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void link(conflict.externalId, conflict.productId, true)}
                        style={{ ...primaryButtonStyle, minHeight: 40 }}
                      >
                        כן, להחליף את הקישור
                      </button>
                      <button type="button" onClick={() => setConflict(null)} style={secondaryButtonStyle}>
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {picking && (
        <ProductPicker
          onClose={() => setPicking(null)}
          onPick={(product) => {
            const externalId = picking
            setPicking(null)
            void link(externalId, product.id)
          }}
        />
      )}
    </div>
  )
}

function ConfirmRow({ text, busy, onYes, onNo }: { text: string; busy: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 14 }}>{text}</span>
      <button type="button" disabled={busy} onClick={onYes} style={{ ...primaryButtonStyle, minHeight: 40 }}>
        {busy ? 'עובד...' : 'כן'}
      </button>
      <button type="button" disabled={busy} onClick={onNo} style={secondaryButtonStyle}>
        ביטול
      </button>
    </div>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 18,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: 15,
    cursor: 'pointer',
  }
}

const variantChipStyle: React.CSSProperties = {
  padding: '2px 10px',
  borderRadius: 12,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 13,
}

const candidateRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 8,
  background: 'var(--bg)',
  fontSize: 14,
}

const smallButtonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: '0 14px',
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const warningStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  background: '#fff7e0',
  border: '1px solid #e8c964',
  color: '#5c4a00',
  fontSize: 14,
}

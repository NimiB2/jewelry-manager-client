import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { apiJson } from '../api'
import { isBelowProfitFloor, profitAt } from './discount'
import { formatMoney, formatPercent } from './format'
import type { PricingMeta, Product, SaveProductBody } from './types'

type ProductsTableProps = {
  products: Product[]
  meta: PricingMeta | null
  onOpen: (product: Product) => void
  onUpdated: (product: Product) => void
}

// The catalog as a compact list that fits the screen without scrolling sideways: a type icon, the name with
// its material and weight in a small line, the site price (the number that matters, so the biggest), and
// the profit. The weight and the price are typed straight into the row and saved on Enter or when the
// field is left; everything else is one tap on the name away.
export function ProductsTable({ products, meta, onOpen, onUpdated }: ProductsTableProps) {
  return (
    <div style={wrapStyle}>
      <div style={{ ...rowGrid, padding: '7px 10px' }}>
        <span />
        <span style={headStyle}>מוצר</span>
        <span style={{ ...headStyle, textAlign: 'left' }}>מחיר באתר</span>
        <span style={{ ...headStyle, textAlign: 'left' }}>רווח</span>
      </div>
      {products.map((product) => (
        <Row key={product.id} product={product} meta={meta} onOpen={onOpen} onUpdated={onUpdated} />
      ))}
    </div>
  )
}

function Row({ product, meta, onOpen, onUpdated }: { product: Product; meta: PricingMeta | null; onOpen: (p: Product) => void; onUpdated: (p: Product) => void }) {
  const profit = meta ? profitAt(product, meta, product.sitePrice) : null
  const belowFloor = isBelowProfitFloor(product, meta, product.sitePrice)

  // Weight needs the whole product saved (the server takes it as one piece); the price has its own quick call.
  async function saveWeight(value: number) {
    const body: SaveProductBody = {
      type: product.type,
      name: product.name,
      material: product.material,
      weight: value,
      additionalWorkHours: product.additionalWorkHours,
      sitePrice: product.sitePrice,
      additions: product.additions,
      collectionIds: product.collectionIds,
    }
    onUpdated(await apiJson<Product>(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) }))
  }

  async function savePrice(value: number) {
    onUpdated(
      await apiJson<Product>(`/products/${product.id}/site-price`, { method: 'PATCH', body: JSON.stringify({ sitePrice: value }) }),
    )
  }

  return (
    <div style={{ ...rowGrid, ...rowStyle }}>
      <TypeIcon type={product.type} />

      <div style={{ minWidth: 0 }}>
        <button type="button" onClick={() => onOpen(product)} style={nameButtonStyle}>
          {product.name}
        </button>
        <div style={subLineStyle}>
          {product.material ? <span>{product.material}</span> : <span style={missingBadgeStyle}>חסר חומר</span>}
          <span aria-hidden="true">·</span>
          <EditableNumber
            value={product.weight}
            label={`משקל של ${product.name}`}
            onSave={saveWeight}
            width={64}
            render={(value) =>
              value === 0 ? (
                <span style={missingBadgeStyle}>חסר משקל</span>
              ) : (
                <span style={{ borderBottom: '1px dotted var(--text-muted)' }}>{value} גרם</span>
              )
            }
            buttonStyle={smallButtonStyle}
          />
        </div>
      </div>

      <div style={{ textAlign: 'left' }}>
        <EditableNumber
          value={product.sitePrice}
          label={`מחיר של ${product.name}`}
          onSave={savePrice}
          width={84}
          render={(value) => (value === 0 ? <span style={missingBadgeStyle}>חסר מחיר</span> : formatMoney(value))}
          buttonStyle={priceButtonStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {product.price ? `מומלץ ${formatMoney(Math.round(product.price.recommendedPrice))}` : 'מומלץ —'}
        </div>
      </div>

      <div style={{ textAlign: 'left', fontSize: 12, color: belowFloor ? 'var(--danger)' : 'var(--text)' }}>
        {profit ? (
          <>
            {formatMoney(Math.round(profit.amount))}
            <div style={{ fontSize: 11, color: belowFloor ? 'var(--danger)' : 'var(--text-muted)' }}>{formatPercent(profit.rate)}</div>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </div>
    </div>
  )
}

// A small drawing in place of the word: ring, earrings, necklace, bracelet. Anything else (or nothing yet) is
// a plain gem, and a missing type is a dashed circle.
function TypeIcon({ type }: { type: string }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    role: 'img' as const,
    'aria-label': type || 'סוג חסר',
    style: { color: 'var(--text-muted)' } as CSSProperties,
  }

  let shape: ReactNode
  if (type.includes('טבעת')) {
    shape = (
      <>
        <circle cx="12" cy="15" r="5.5" />
        <path d="M9.5 6.5l2.5-3 2.5 3-2.5 2z" />
      </>
    )
  } else if (type.includes('עגיל')) {
    shape = (
      <>
        <path d="M8 4v4M16 4v4" />
        <circle cx="8" cy="11" r="3" />
        <circle cx="16" cy="11" r="3" />
        <path d="M8 14.5v3M16 14.5v3" />
      </>
    )
  } else if (type.includes('שרשרת') || type.includes('תליון')) {
    shape = (
      <>
        <path d="M5 5c0 8 3 11 7 11s7-3 7-11" />
        <path d="M12 16v2" />
        <circle cx="12" cy="20" r="1.6" />
      </>
    )
  } else if (type.includes('צמיד')) {
    shape = <ellipse cx="12" cy="12" rx="8" ry="5.5" />
  } else if (type) {
    shape = <path d="M6 9l3-4h6l3 4-6 10z" />
  } else {
    return (
      <svg {...common} style={{ color: 'var(--warning)' }}>
        <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <title>{type}</title>
      {shape}
    </svg>
  )
}

type EditableNumberProps = {
  value: number
  label: string
  width: number
  render: (value: number) => ReactNode
  buttonStyle: CSSProperties
  onSave: (value: number) => Promise<void>
}

// A number that reads as plain text until it is tapped. Enter or leaving the field saves it, Escape drops the change.
function EditableNumber({ value, label, width, render, buttonStyle, onSave }: EditableNumberProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function start() {
    setDraft(String(value))
    setError(null)
    setEditing(true)
  }

  async function commit() {
    const text = draft.trim().replace(',', '.')
    const next = Number(text)

    if (text === '' || !Number.isFinite(next) || next < 0) {
      setError('מספר לא תקין')
      return
    }

    if (next === value) {
      setEditing(false)
      return
    }

    setBusy(true)
    try {
      await onSave(next)
      setEditing(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <span style={{ display: 'inline-block' }}>
        <input
          autoFocus
          inputMode="decimal"
          value={draft}
          disabled={busy}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setEditing(false)
              setError(null)
            }
          }}
          style={{ ...inputStyle, width }}
        />
        {error && <span style={{ display: 'block', fontSize: 11, color: 'var(--danger)' }}>{error}</span>}
      </span>
    )
  }

  return (
    <button type="button" onClick={start} aria-label={`${label}, לעריכה`} style={buttonStyle}>
      {render(value)}
    </button>
  )
}

const rowGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '34px minmax(0, 1fr) 86px 64px',
  gap: 8,
  alignItems: 'center',
}

const wrapStyle: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 10,
  boxShadow: 'var(--shadow)',
  overflow: 'hidden',
}

const rowStyle: CSSProperties = {
  padding: '9px 10px',
  borderTop: '1px solid var(--border)',
}

const headStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
}

const nameButtonStyle: CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  border: 'none',
  background: 'transparent',
  padding: 0,
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text)',
  textAlign: 'right',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const subLineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11,
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
}

const missingBadgeStyle: CSSProperties = {
  background: 'var(--warning-bg)',
  color: 'var(--warning)',
  borderRadius: 4,
  padding: '0 4px',
}

const priceButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  font: 'inherit',
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text)',
  cursor: 'text',
}

const smallButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  font: 'inherit',
  fontSize: 11,
  color: 'var(--text-muted)',
  cursor: 'text',
}

const inputStyle: CSSProperties = {
  minHeight: 32,
  padding: '0 6px',
  font: 'inherit',
  fontSize: 15,
  border: '1.5px solid var(--accent)',
  borderRadius: 6,
  background: 'var(--surface)',
  color: 'var(--text)',
  textAlign: 'right',
}

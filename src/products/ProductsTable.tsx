import { useState } from 'react'
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

// The catalog as a table, for going through many products fast: weight and site price are typed
// straight into the row and saved on Enter or when the field is left. Everything else is read-only here
// (the full editor is one tap on the name).
export function ProductsTable({ products, meta, onOpen, onUpdated }: ProductsTableProps) {
  return (
    <div style={wrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headStyle, ...stickyStyle }}>מוצר</th>
            <th style={headStyle}>סוג</th>
            <th style={headStyle}>חומר</th>
            <th style={headStyle}>משקל</th>
            <th style={headStyle}>מחיר באתר</th>
            <th style={headStyle}>מומלץ</th>
            <th style={headStyle}>רווח</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <Row key={product.id} product={product} meta={meta} onOpen={onOpen} onUpdated={onUpdated} />
          ))}
        </tbody>
      </table>
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
    <tr>
      <td style={{ ...cellStyle, ...stickyStyle }}>
        <button type="button" onClick={() => onOpen(product)} style={nameButtonStyle}>
          {product.name}
        </button>
      </td>
      <td style={{ ...cellStyle, ...(product.type ? null : missingStyle) }}>{product.type || 'חסר'}</td>
      <td style={{ ...cellStyle, ...(product.material ? null : missingStyle) }}>{product.material || 'חסר'}</td>
      <td style={cellStyle}>
        <EditableNumber value={product.weight} missing={product.weight === 0} suffix=" גרם" onSave={saveWeight} label={`משקל של ${product.name}`} />
      </td>
      <td style={cellStyle}>
        <EditableNumber value={product.sitePrice} missing={product.sitePrice === 0} format={formatMoney} onSave={savePrice} label={`מחיר של ${product.name}`} />
      </td>
      <td style={{ ...cellStyle, color: 'var(--text-muted)' }}>
        {product.price ? formatMoney(Math.round(product.price.recommendedPrice)) : '—'}
      </td>
      <td style={{ ...cellStyle, color: belowFloor ? 'var(--danger)' : undefined, whiteSpace: 'nowrap' }}>
        {profit ? `${formatMoney(Math.round(profit.amount))} · ${formatPercent(profit.rate)}` : '—'}
      </td>
    </tr>
  )
}

type EditableNumberProps = {
  value: number
  missing?: boolean
  suffix?: string
  format?: (value: number) => string
  label: string
  onSave: (value: number) => Promise<void>
}

// A number that reads as plain text until it is tapped. Enter or leaving the field saves it, Escape drops the change.
function EditableNumber({ value, missing, suffix = '', format, label, onSave }: EditableNumberProps) {
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
      <div>
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
          style={inputStyle}
        />
        {error && <div style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</div>}
      </div>
    )
  }

  return (
    <button type="button" onClick={start} aria-label={`${label}, לעריכה`} style={{ ...numberButtonStyle, ...(missing ? missingStyle : null) }}>
      {missing ? 'חסר' : `${format ? format(value) : value}${suffix}`}
    </button>
  )
}

const wrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  background: 'var(--surface)',
  borderRadius: 10,
  boxShadow: 'var(--shadow)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
}

const headStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  textAlign: 'right',
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const cellStyle: React.CSSProperties = {
  padding: '4px 10px',
  textAlign: 'right',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  background: 'var(--surface)',
}

// The name stays in view while the numbers scroll sideways.
const stickyStyle: React.CSSProperties = {
  position: 'sticky',
  insetInlineStart: 0,
  zIndex: 1,
  maxWidth: 170,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const missingStyle: React.CSSProperties = {
  background: 'var(--warning-bg)',
  color: 'var(--warning)',
  borderRadius: 6,
}

const nameButtonStyle: React.CSSProperties = {
  maxWidth: 160,
  border: 'none',
  background: 'transparent',
  padding: '8px 0',
  font: 'inherit',
  fontWeight: 600,
  color: 'var(--text)',
  textAlign: 'right',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const numberButtonStyle: React.CSSProperties = {
  minWidth: 64,
  minHeight: 36,
  padding: '0 8px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  font: 'inherit',
  color: 'var(--text)',
  textAlign: 'right',
  cursor: 'text',
}

const inputStyle: React.CSSProperties = {
  width: 84,
  minHeight: 36,
  padding: '0 8px',
  font: 'inherit',
  fontSize: 15,
  border: '1.5px solid var(--accent)',
  borderRadius: 6,
  background: 'var(--surface)',
  color: 'var(--text)',
  textAlign: 'right',
}

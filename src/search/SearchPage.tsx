import { useEffect, useRef, useState } from 'react'
import { apiJson } from '../api'
import { SearchIcon } from '../icons/NavIcons'
import { formatOrderDate } from '../orders/dates'
import { STATUS_LABELS } from '../orders/status'
import type { OrderStatus } from '../orders/types'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, mutedTextStyle } from '../products/productStyles'
import { Skeleton } from '../shell/Skeleton'
import { navigate } from '../shell/useRoute'

type OrderHit = {
  id: string
  number: number
  customer: string | null
  externalName: string | null
  date: string
  finalAmount: number
  status: OrderStatus
  isPendingApproval: boolean
}
type ProductHit = { id: string; name: string; type: string; material: string; sitePrice: number; shopifyName: string | null }
type ExpenseHit = { id: string; date: string; description: string; supplier: string | null; amount: number; hasInvoice: boolean }
type SearchResult = { query: string; orders: OrderHit[]; products: ProductHit[]; expenses: ExpenseHit[] }

const MIN_LENGTH = 2

// One box that finds an order, a product or an expense. A tap on a result opens it.
export function SearchPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  useEffect(() => {
    const query = text.trim()
    const ticket = ++latest.current

    if (query.length < MIN_LENGTH) {
      setResult(null)
      setLoading(false)
      return
    }

    // A pause after the last key, so each letter does not hit the server.
    setLoading(true)
    const timer = setTimeout(() => {
      apiJson<SearchResult>(`/search?q=${encodeURIComponent(query)}`)
        .then((found) => {
          if (ticket !== latest.current) return
          setResult(found)
          setError(null)
        })
        .catch((err) => {
          if (ticket === latest.current) setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false)
        })
    }, 250)

    return () => clearTimeout(timer)
  }, [text])

  const nothing =
    result !== null && result.orders.length === 0 && result.products.length === 0 && result.expenses.length === 0

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={iconStyle}>
            <SearchIcon />
          </span>
          <input
            autoFocus
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="הזמנה, לקוחה, מוצר או הוצאה"
            aria-label="חיפוש"
            style={{ ...fieldInputStyle, minHeight: 48, paddingInlineStart: 40, fontSize: 17 }}
          />
        </div>
        <button type="button" onClick={() => window.history.back()} style={closeStyle}>
          סגירה
        </button>
      </div>

      {error && <p style={errorTextStyle}>{error}</p>}

      {loading && !result && (
        <div role="status" aria-label="מחפש" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton height={44} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      )}

      {text.trim().length > 0 && text.trim().length < MIN_LENGTH && (
        <p style={mutedTextStyle}>כדאי להקליד לפחות שתי אותיות.</p>
      )}

      {nothing && <p style={mutedTextStyle}>לא נמצא דבר עבור "{result?.query}".</p>}

      {result && result.orders.length > 0 && (
        <Group title="הזמנות">
          {result.orders.map((o) => (
            <Row
              key={o.id}
              onClick={() => navigate(`/orders/${o.id}`)}
              title={`${o.customer ?? 'ללא שם'} · #${o.number}`}
              detail={`${formatOrderDate(o.date)} · ${o.isPendingApproval ? 'ממתינה לאישור' : STATUS_LABELS[o.status]}${o.externalName ? ` · ${o.externalName} בחנות` : ''}`}
              value={formatMoney(o.finalAmount)}
            />
          ))}
        </Group>
      )}

      {result && result.products.length > 0 && (
        <Group title="מוצרים">
          {result.products.map((p) => (
            <Row
              key={p.id}
              onClick={() => navigate(`/products/${p.id}`)}
              title={p.name}
              detail={[p.type, p.material, p.shopifyName].filter(Boolean).join(' · ')}
              value={formatMoney(p.sitePrice)}
            />
          ))}
        </Group>
      )}

      {result && result.expenses.length > 0 && (
        <Group title="הוצאות">
          {result.expenses.map((e) => (
            <Row
              key={e.id}
              onClick={() => navigate('/finances')}
              title={e.description}
              detail={`${formatOrderDate(e.date)}${e.supplier ? ` · ${e.supplier}` : ''}${e.hasInvoice ? '' : ' · בלי חשבונית'}`}
              value={formatMoney(e.amount)}
            />
          ))}
        </Group>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-muted)' }}>{title}</h2>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>{children}</div>
    </section>
  )
}

function Row({ title, detail, value, onClick }: { title: string; detail: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={rowStyle}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{detail}</span>
      </span>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{value}</span>
    </button>
  )
}

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  insetInlineStart: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  display: 'flex',
}

const closeStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 15,
  cursor: 'pointer',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface)',
  textAlign: 'right',
  font: 'inherit',
  color: 'var(--text)',
  cursor: 'pointer',
}

import type { OrderSource } from './types'

const icon = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// A small mark showing where the order came from: typed in by hand, or pulled from Shopify.
export function SourceBadge({ source }: { source: OrderSource }) {
  const shopify = source === 'SHOPIFY'
  const label = shopify ? 'Shopify' : 'ידנית'

  return (
    <span
      title={shopify ? 'הזמנה שנכנסה מ-Shopify' : 'הזמנה שהוזנה ידנית'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}
    >
      {shopify ? (
        <svg {...icon}>
          <path d="M6 7h12l1 13H5L6 7z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
      ) : (
        <svg {...icon}>
          <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
        </svg>
      )}
      {label}
    </span>
  )
}

import type { OrderSource } from './types'

const icon = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// A tiny, quiet mark of where the order came from: a keyboard for one typed in by hand, a shopping
// bag for Shopify. Icon only; the meaning is in the tooltip and the screen-reader label.
export function SourceBadge({ source }: { source: OrderSource }) {
  const shopify = source === 'SHOPIFY'
  const label = shopify ? 'הזמנה שנכנסה מ-Shopify' : 'הזמנה שהוזנה ידנית'

  return (
    <span
      role="img"
      title={label}
      aria-label={label}
      style={{ display: 'inline-flex', verticalAlign: 'middle', color: 'var(--text-muted)', opacity: 0.8 }}
    >
      {shopify ? (
        <svg {...icon}>
          <path d="M6 7h12l1 13H5L6 7z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
      ) : (
        <svg {...icon}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
        </svg>
      )}
    </span>
  )
}

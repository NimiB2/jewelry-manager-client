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

// Shopify's green, and a darker shade of it for text that has to be readable on a light background.
const SHOPIFY_GREEN = '#95BF47'
const SHOPIFY_DARK = '#4F7A1E'

// The Shopify mark: its green shopping bag with the "S" in it.
function ShopifyMark() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.2 7.5h13.6l1 13.2a.8.8 0 0 1-.8.8H5a.8.8 0 0 1-.8-.8l1-13.2z" fill={SHOPIFY_GREEN} />
      <path
        d="M8.8 7.5a3.2 3.2 0 0 1 6.4 0"
        fill="none"
        stroke={SHOPIFY_DARK}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <text x="12" y="18" textAnchor="middle" fontSize="9.5" fontWeight="700" fontFamily="Arial, sans-serif" fill="#fff">
        S
      </text>
    </svg>
  )
}

// Where the order came from, in words. An order from the store carries Shopify's mark and colour, because
// she treats those differently (the store already sent the receipt, and they wait for her approval).
export function SourceBadge({ source, compact = false }: { source: OrderSource; compact?: boolean }) {
  // On a card the origin is a quiet word at the end of the line, not a chip.
  if (compact) {
    return source === 'SHOPIFY' ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: SHOPIFY_DARK, fontWeight: 600 }}>
        <ShopifyMark />
        מהשופיפי
      </span>
    ) : (
      <span>ידנית</span>
    )
  }

  if (source === 'SHOPIFY') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '0 6px',
          borderRadius: 6,
          background: 'rgba(149, 191, 71, 0.18)',
          color: SHOPIFY_DARK,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: '18px',
          verticalAlign: 'middle',
        }}
      >
        <ShopifyMark />
        הזמנה מהשופיפי
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '0 6px',
        borderRadius: 6,
        background: 'var(--border)',
        color: 'var(--text)',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: '18px',
        verticalAlign: 'middle',
      }}
    >
      <svg {...icon}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
      </svg>
      הזמנה ידנית
    </span>
  )
}

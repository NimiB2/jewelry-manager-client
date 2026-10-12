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

// Where the order came from. An order from the store says so in words ("הזמנה מהשופיפי"), because she
// treats those differently (the store already sent the receipt, and they wait for her approval);
// a hand-typed one says "הזמנה ידנית" in gray.
export function SourceBadge({ source }: { source: OrderSource }) {
  if (source === 'SHOPIFY') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '1px 8px',
          borderRadius: 8,
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          fontSize: 12,
          fontWeight: 600,
          verticalAlign: 'middle',
        }}
      >
        <svg {...icon}>
          <path d="M6 7h12l1 13H5L6 7z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
        הזמנה מהשופיפי
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px',
        borderRadius: 8,
        background: 'var(--border)',
        color: 'var(--text)',
        fontSize: 12,
        fontWeight: 600,
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

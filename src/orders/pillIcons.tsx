const base = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  style: { flexShrink: 0 },
}

// Small icons that tell the two "was it sent" marks apart at a glance: a receipt, and a speech bubble.
export function ReceiptIcon() {
  return (
    <svg {...base}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  )
}

export function ChatIcon() {
  return (
    <svg {...base}>
      <path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.5A8 8 0 1 1 21 12z" />
    </svg>
  )
}

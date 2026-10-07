import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function OrdersIcon() {
  return (
    <Icon>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </Icon>
  )
}

export function ProductsIcon() {
  return (
    <Icon>
      <path d="M6 3h12l3 6-9 12L3 9z" />
      <path d="M3 9h18M9 3l3 6 3-6M12 21 9 9m3 12 3-12" />
    </Icon>
  )
}

export function FinancesIcon() {
  return (
    <Icon>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </Icon>
  )
}

export function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Icon>
  )
}

export function BackIcon() {
  return (
    <Icon>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </Icon>
  )
}

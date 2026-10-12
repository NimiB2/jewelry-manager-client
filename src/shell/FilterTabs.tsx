import type { CSSProperties } from 'react'

export type FilterTab<T extends string> = {
  value: T
  label: string
  // Shown next to the label in a quiet tone; leave out when the number isn't known.
  count?: number
}

// One look for every "pick a view" row in the app: plain text tabs with an underline on the active one.
// Presentation only — the page keeps its own state and decides what each value does.
export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  style,
}: {
  items: FilterTab<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
  style?: CSSProperties
}) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ ...barStyle, ...style }}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button key={item.value} type="button" aria-pressed={active} onClick={() => onChange(item.value)} style={tabStyle(active)}>
            {item.label}
            {item.count !== undefined && <span style={countStyle}>{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

const barStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  borderBottom: '1px solid var(--border)',
  overflowX: 'auto',
  scrollbarWidth: 'none',
}

// Exported for the odd single button that must sit beside a tab row and look like one of its tabs.
export function tabStyle(active: boolean, warn = false): CSSProperties {
  const activeColor = warn ? 'var(--danger)' : 'var(--text)'
  return {
    flex: '0 0 auto',
    minHeight: 40,
    padding: '0 14px',
    border: 'none',
    borderBottom: `2px solid ${active ? activeColor : 'transparent'}`,
    marginBottom: -1,
    background: 'transparent',
    color: active ? activeColor : 'var(--text-muted)',
    fontSize: 15,
    fontWeight: active ? 600 : 400,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  }
}

const countStyle: CSSProperties = {
  marginInlineStart: 6,
  fontSize: 13,
  fontWeight: 400,
  color: 'var(--text-muted)',
}

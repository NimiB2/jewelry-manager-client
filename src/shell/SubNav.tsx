import type { SubItem } from './navItems'

// The sub-options as a row of tabs at the top of a screen. On a phone this is the only place they
// appear (the bottom bar is full); on a wide screen the sidebar lists them too.
export function SubNav({ items }: { items: SubItem[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="תתי-אפשרויות" style={barStyle}>
      {items.map((item) => (
        <a key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} style={linkStyle(item.active)}>
          {item.label}
        </a>
      ))}
    </nav>
  )
}

// Same look as FilterTabs: plain text with an underline on the current one.
const barStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 12,
  borderBottom: '1px solid var(--border)',
  overflowX: 'auto',
  scrollbarWidth: 'none',
}

function linkStyle(active: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    minHeight: 40,
    padding: '0 14px',
    marginBottom: -1,
    fontSize: 15,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    borderBottom: `2px solid ${active ? 'var(--text)' : 'transparent'}`,
    color: active ? 'var(--text)' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400,
  }
}

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

const barStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginBottom: 12,
  overflowX: 'auto',
  scrollbarWidth: 'none',
}

function linkStyle(active: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto',
    padding: '8px 14px',
    borderRadius: 18,
    fontSize: 15,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontWeight: active ? 600 : 400,
  }
}

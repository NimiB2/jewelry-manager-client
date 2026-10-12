import { SearchIcon } from '../icons/NavIcons'
import { navigate } from '../shell/useRoute'

// The way into the search, placed in the header of the main screens.
export function SearchButton() {
  return (
    <button type="button" onClick={() => navigate('/search')} aria-label="חיפוש" title="חיפוש" style={style}>
      <SearchIcon />
    </button>
  )
}

const style: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text)',
  cursor: 'pointer',
  flexShrink: 0,
}

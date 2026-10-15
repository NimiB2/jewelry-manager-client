import { createContext, useContext, useState, type ReactNode } from 'react'
import { sectionCardStyle, sectionTitleStyle } from './formStyles'

// Under this provider every Section is a closed row that opens on tap, one at a time. Without it
// (the pricing tab) sections stay open cards, as before.
type AccordionValue = { openTitle: string | null; toggle: (title: string) => void }
const AccordionContext = createContext<AccordionValue | null>(null)

export function SectionAccordion({ children }: { children: ReactNode }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null)
  return (
    <AccordionContext.Provider value={{ openTitle, toggle: (title) => setOpenTitle((cur) => (cur === title ? null : title)) }}>
      {children}
    </AccordionContext.Provider>
  )
}

// A small heading that groups several sections.
export function SectionGroupTitle({ children }: { children: ReactNode }) {
  return <h2 style={groupTitleStyle}>{children}</h2>
}

type SectionProps = {
  title: string
  // Shown next to the title when the section is a list ("14").
  count?: number
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, count, action, children }: SectionProps) {
  const accordion = useContext(AccordionContext)

  if (!accordion) {
    return (
      <section className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {action}
        </div>
        <div style={sectionCardStyle}>{children}</div>
      </section>
    )
  }

  const open = accordion.openTitle === title
  return (
    <section style={rowWrapStyle}>
      <button type="button" onClick={() => accordion.toggle(title)} aria-expanded={open} style={rowButtonStyle}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
        {count !== undefined && <span style={countStyle}>{count}</span>}
        <span aria-hidden style={{ marginInlineStart: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {/* Hidden, not unmounted: the forms keep their unsaved edits while closed. */}
      <div hidden={!open} style={{ padding: '4px 12px 12px', borderTop: '1px solid var(--border)' }}>
        {action && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{action}</div>}
        {children}
      </div>
    </section>
  )
}

const groupTitleStyle: React.CSSProperties = {
  margin: '18px 4px 6px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
}

const rowWrapStyle: React.CSSProperties = {
  marginBottom: 6,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  overflow: 'hidden',
}

const rowButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  cursor: 'pointer',
  textAlign: 'right',
}

const countStyle: React.CSSProperties = {
  minWidth: 22,
  padding: '1px 7px',
  borderRadius: 10,
  background: 'var(--border)',
  color: 'var(--text-muted)',
  fontSize: 12,
  textAlign: 'center',
}

type UndoButtonProps = {
  hasChanges: boolean
  onUndo: () => void
}

export function UndoButton({ hasChanges, onUndo }: UndoButtonProps) {
  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={!hasChanges}
      style={{
        minHeight: 30,
        padding: '4px 10px',
        border: 'none',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--accent)',
        fontSize: 13,
        cursor: 'pointer',
        opacity: hasChanges ? 1 : 0.35,
      }}
    >
      ↩ ביטול שינויים
    </button>
  )
}

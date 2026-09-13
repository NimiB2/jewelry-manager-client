import type { ReactNode } from 'react'
import { sectionCardStyle, sectionTitleStyle } from './formStyles'

type SectionProps = {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, action, children }: SectionProps) {
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

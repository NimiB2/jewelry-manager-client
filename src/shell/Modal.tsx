import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

// A centered window over the page. It closes with Esc or the X button, but not by a tap on the
// dark area, so a half-filled form is not lost by a stray touch.
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)

    // The page behind must not scroll while the window is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title}>
      <div style={windowStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="סגירה" style={closeStyle}>
            ✕
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 16px 16px' }}>{children}</div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 16px 8vh',
}

const windowStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  maxHeight: '86dvh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  borderRadius: 16,
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
}

const closeStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: 'none',
  borderRadius: 20,
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 18,
  cursor: 'pointer',
}

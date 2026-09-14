import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { TrashIcon } from '../icons/TrashIcon'
import { rowDeleteButtonStyle } from './formStyles'

type ConfirmDeleteButtonProps = {
  onConfirm: () => void
  ariaLabel: string
  triggerStyle?: CSSProperties
  disabled?: boolean
}

// Shared delete-with-confirmation control for every settings list (materials,
// pricing additions, fees, collections, preparation stages). Clicking the
// trash icon arms a small yes/no popover instead of deleting immediately;
// clicking anywhere outside it cancels with no side effect.
export function ConfirmDeleteButton({ onConfirm, ariaLabel, triggerStyle, disabled }: ConfirmDeleteButtonProps) {
  const [armed, setArmed] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!armed) return
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setArmed(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [armed])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setArmed(true)}
        disabled={disabled}
        aria-label={ariaLabel}
        style={triggerStyle ?? rowDeleteButtonStyle}
      >
        <TrashIcon />
      </button>
      {armed && (
        <div style={popoverStyle}>
          <span style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>למחוק?</span>
          <button
            type="button"
            onClick={() => {
              setArmed(false)
              onConfirm()
            }}
            aria-label="אישור מחיקה"
            style={confirmButtonStyle}
          >
            כן
          </button>
          <button type="button" onClick={() => setArmed(false)} aria-label="ביטול מחיקה" style={cancelButtonStyle}>
            לא
          </button>
        </div>
      )}
    </div>
  )
}

const popoverStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  insetInlineEnd: 0,
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  zIndex: 20,
}

const confirmButtonStyle: CSSProperties = {
  minHeight: 26,
  padding: '2px 10px',
  border: 'none',
  borderRadius: 6,
  background: 'var(--danger)',
  color: 'var(--accent-contrast)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const cancelButtonStyle: CSSProperties = {
  minHeight: 26,
  padding: '2px 10px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 12,
  cursor: 'pointer',
}

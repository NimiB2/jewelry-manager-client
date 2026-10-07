type ConfirmInlineProps = {
  message: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// A small "are you sure?" box that opens in place, for steps that lock or are hard to notice
// if tapped by mistake (e.g. completing an order).
export function ConfirmInline({ message, confirmLabel, busy, onConfirm, onCancel }: ConfirmInlineProps) {
  return (
    <div role="alertdialog" aria-label={message} style={boxStyle}>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--warning)', fontWeight: 600 }}>{message}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onConfirm} disabled={busy} style={confirmStyle}>
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={cancelStyle}>
          ביטול
        </button>
      </div>
    </div>
  )
}

const boxStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 12px',
  borderRadius: 8,
  background: 'var(--warning-bg)',
}

const confirmStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 40,
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

const cancelStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 40,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 15,
  cursor: 'pointer',
}

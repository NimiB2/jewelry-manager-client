import type { CSSProperties } from 'react'

export const sectionCardStyle: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 10,
  padding: '10px 12px',
}

// Bold and prominent — the card content below is deliberately quieter,
// so the eye lands on section titles first when scanning the page.
export const sectionTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text)',
  margin: 0,
}

export const nameInputStyle: CSSProperties = {
  width: '100%',
  minHeight: 36,
  padding: '4px 6px',
  fontSize: 14,
  fontWeight: 400,
  border: '1px solid transparent',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--text)',
  textAlign: 'right',
}

export const cellInputStyle: CSSProperties = {
  width: '100%',
  minHeight: 36,
  padding: '4px 6px',
  fontSize: 14,
  fontWeight: 400,
  border: '1px solid transparent',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--accent)',
  textAlign: 'center',
}

export const iconButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: 8,
  background: 'var(--danger-bg)',
  color: 'var(--danger)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

export const rowDeleteButtonStyle: CSSProperties = { ...iconButtonStyle, width: 28, height: 28 }

export const addRowButtonStyle: CSSProperties = {
  minHeight: 44,
  width: '100%',
  marginTop: 10,
  border: '1px dashed var(--border)',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 14,
  cursor: 'pointer',
}

export const statusTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  marginTop: 8,
}

import type { CSSProperties } from 'react'

export const fieldLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text-muted)',
  marginBottom: 4,
}

export const fieldInputStyle: CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  fontSize: 16,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  textAlign: 'right',
}

export const cardStyle: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 10,
  padding: '12px',
  boxShadow: 'var(--shadow)',
}

export const primaryButtonStyle: CSSProperties = {
  minHeight: 44,
  padding: '0 18px',
  border: 'none',
  borderRadius: 10,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
}

export const secondaryButtonStyle: CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--accent)',
  fontSize: 15,
  cursor: 'pointer',
}

export const linkButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 13,
  padding: '4px 0',
  cursor: 'pointer',
}

export const errorTextStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--danger)',
}

export const mutedTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
}

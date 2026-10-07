import type { CSSProperties } from 'react'
import { fieldInputStyle } from '../products/productStyles'

// A rounded filter button; the active one is tinted.
export function chipStyle(active: boolean): CSSProperties {
  return {
    minHeight: 36,
    minWidth: 64,
    padding: '0 14px',
    borderRadius: 18,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: 15,
    cursor: 'pointer',
  }
}

export const selectStyle: CSSProperties = {
  ...fieldInputStyle,
  minHeight: 40,
  padding: '4px 8px',
  fontSize: 14,
}

export const smallPillStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 8px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
}

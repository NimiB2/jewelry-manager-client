import type { CSSProperties } from 'react'
import { cardStyle } from '../products/productStyles'

// A grey bar that stands where content will be, so a screen has its shape from the first moment and
// does not jump when the data arrives. It only pulses (and stands still for people who turned motion off).
export function Skeleton({ width = '100%', height = 16, style }: { width?: number | string; height?: number; style?: CSSProperties }) {
  return <span aria-hidden="true" className="skeleton" style={{ display: 'block', width, height, borderRadius: 6, ...style }} />
}

// Card-shaped placeholders for a list that is loading.
export function SkeletonCards({ count = 3, label = 'טוען' }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <Skeleton width="45%" height={18} />
            <Skeleton width={64} height={18} />
          </div>
          <Skeleton width="65%" height={13} style={{ marginTop: 10 }} />
          <Skeleton width="30%" height={13} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}

import { useEffect } from 'react'

type ToastProps = {
  // Lines of text; the first one is the headline.
  lines: string[]
  onDone: () => void
}

// A short celebration at the top of the screen: it pops in, stays a few seconds, and goes away on
// its own (or on a tap). Used when an order is completed.
export function Toast({ lines, onDone }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000)
    return () => clearTimeout(timer)
  }, [lines, onDone])

  return (
    <div role="status" aria-live="polite" className="toast-success" onClick={onDone}>
      <span className="toast-check" aria-hidden="true">
        ✓
      </span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{lines[0]}</div>
        {lines.slice(1).map((line) => (
          <div key={line} style={{ fontSize: 13, opacity: 0.95 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

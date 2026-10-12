import { useEffect, useState } from 'react'
import { apiJson } from '../api'

// What needs her eye: orders waiting for approval, plus orders the store cancelled, deleted or changed.
export type Attention = { pending: number; alerts: number; messagesToSend: number; total: number }

const CHANGED = 'orders-attention-changed'

// Called after anything that can change those numbers (approve, reject, dismiss), so the menu badge
// updates at once instead of waiting for the next refresh.
export function notifyOrdersChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

const REFRESH_MS = 60_000

// The numbers behind the red badge on "Orders" and the banner on the home screen. It refreshes when the
// screen changes, when she comes back to the tab, and once a minute, so a store order shows up without a reload.
export function useOrdersAttention(refreshKey: string): Attention | null {
  const [attention, setAttention] = useState<Attention | null>(null)

  useEffect(() => {
    let alive = true

    const load = () => {
      if (document.visibilityState === 'hidden') return
      apiJson<Attention>('/orders/attention')
        .then((value) => alive && setAttention(value))
        .catch(() => undefined) // a missing badge is better than an error on every screen
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    document.addEventListener('visibilitychange', load)
    window.addEventListener(CHANGED, load)

    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
      window.removeEventListener(CHANGED, load)
    }
  }, [refreshKey])

  return attention
}

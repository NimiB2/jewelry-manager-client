import { useState } from 'react'
import { apiJson } from '../api'
import { errorTextStyle, secondaryButtonStyle } from '../products/productStyles'
import { notifyOrdersChanged } from './attention'
import { STORE_ALERT_LABEL, hasStoreAlert } from './storeAlert'
import type { Order, StoreAlert } from './types'

type StoreAlertNoticeProps = {
  order: Order
  // Called after the warning was dismissed, so the list can reload.
  onChanged: () => void
}

function hint(alert: Exclude<StoreAlert, 'NONE'>, pending: boolean): string {
  if (alert === 'UPDATED') return 'כדאי לבדוק מה השתנה (פריטים, כמויות, מחיר או הערה) ולעדכן כאן אם צריך.'
  return pending
    ? 'אי אפשר לאשר אותה. אפשר למחוק אותה, או להתעלם מההתראה אם זו טעות.'
    : 'ההכנסה שלה נשארה במערכת. כדאי לבדוק, ולמחוק את ההזמנה אם היא לא אמיתית.'
}

// The store told us something about an order we already have. It is only a warning: nothing was
// changed here (income and tasks stay as they are), and she decides what to do.
export function StoreAlertNotice({ order, onChanged }: StoreAlertNoticeProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!hasStoreAlert(order)) return null
  const alert = order.storeAlert as Exclude<StoreAlert, 'NONE'>
  const severe = alert !== 'UPDATED'

  async function dismiss() {
    setBusy(true)
    setError(null)
    try {
      await apiJson<Order>(`/orders/${order.id}/dismiss-alert`, { method: 'POST' })
      notifyOrdersChanged()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alert"
      style={{
        marginTop: 10,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${severe ? 'var(--danger)' : 'var(--warning)'}`,
        background: severe ? 'var(--danger-bg)' : 'var(--warning-bg)',
        color: 'var(--text)',
      }}
    >
      <div style={{ fontWeight: 700, color: severe ? 'var(--danger)' : 'var(--warning)' }}>
        ⚠ ההזמנה {STORE_ALERT_LABEL[alert]}
      </div>
      <p style={{ margin: '4px 0 8px', fontSize: 13 }}>{hint(alert, order.isPendingApproval === true)}</p>
      <button type="button" disabled={busy} onClick={() => void dismiss()} style={{ ...secondaryButtonStyle, minHeight: 36 }}>
        הבנתי, להסיר את ההתראה
      </button>
      {error && <p style={{ ...errorTextStyle, marginTop: 6, fontSize: 12 }}>{error}</p>}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiJson } from '../api'
import { BackIcon } from '../icons/NavIcons'
import { formatMoney } from '../products/format'
import {
  cardStyle,
  errorTextStyle,
  fieldInputStyle,
  fieldLabelStyle,
  linkButtonStyle,
  mutedTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../products/productStyles'
import type { Product } from '../products/types'
import { ConfirmDeleteButton } from '../settings/ConfirmDeleteButton'
import { navigate, replaceRoute } from '../shell/useRoute'
import { todayIso } from './dates'
import { completionMessage } from './celebrate'
import { ConfirmInline } from './ConfirmInline'
import { ProductPicker } from './ProductPicker'
import { SourceBadge } from './SourceBadge'
import { StageChips } from './StageChips'
import { Toast } from './Toast'
import { STATUS_LABELS, STATUS_ORDER, statusColors } from './status'
import type { Order, OrderStatus, SaveOrderBody } from './types'

type Line = {
  key: string
  lineId: string | null
  productId: string | null
  name: string
  material: string
  unitPrice: string
  quantity: string
}

type FormState = {
  customer: string
  date: string
  notes: string
  lines: Line[]
  discountMode: 'PERCENT' | 'FINAL_AMOUNT'
  discountValue: string
  discountReason: string
}

type OrderFormProps = {
  orderId: string | null
  addProductId: string | null
  restoreDraft: boolean
}

let lineCounter = 0
const nextKey = () => `line-${++lineCounter}`

const emptyState = (): FormState => ({
  customer: '',
  date: todayIso(),
  notes: '',
  lines: [],
  discountMode: 'PERCENT',
  discountValue: '',
  discountReason: '',
})

function stateFromOrder(order: Order): FormState {
  return {
    customer: order.customer ?? '',
    date: order.date,
    notes: order.notes ?? '',
    lines: order.items.map((item) => ({
      key: nextKey(),
      lineId: item.id,
      productId: item.productId,
      name: item.name,
      material: item.material,
      unitPrice: String(item.unitPrice),
      quantity: String(item.quantity),
    })),
    // The saved order only knows the result, so the discount reopens as a final amount.
    discountMode: 'FINAL_AMOUNT',
    discountValue: order.hasDiscount ? String(order.finalAmount) : '',
    discountReason: order.discountReason ?? '',
  }
}

// Same content, ignoring the throwaway keys: used to know whether there is anything unsaved.
const snapshot = (state: FormState) => JSON.stringify({ ...state, lines: state.lines.map(({ key: _key, ...rest }) => rest) })

const draftKey = (orderId: string | null) => `orderDraft:${orderId ?? 'new'}`

function lineTotal(line: Line): number {
  return Math.round((Number(line.unitPrice) || 0) * (Number(line.quantity) || 0) * 100) / 100
}

// Create and edit an order. Lines are copies of catalog products: the price is fixed at the moment
// of the order and later changes to the product never touch it.
export function OrderForm({ orderId, addProductId, restoreDraft }: OrderFormProps) {
  const isNew = orderId === null

  const [state, setState] = useState<FormState>(emptyState)
  const [order, setOrder] = useState<Order | null>(null)
  const [ready, setReady] = useState(isNew)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [stages, setStages] = useState<string[]>([])
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [celebration, setCelebration] = useState<string[] | null>(null)

  const baseline = useRef(snapshot(emptyState()))
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      try {
        let base = emptyState()
        if (orderId) {
          const loaded = await apiJson<Order>(`/orders/${orderId}`)
          setOrder(loaded)
          base = stateFromOrder(loaded)
        }
        baseline.current = snapshot(base)

        // The stages come from settings; without them the stage chips just stay empty.
        apiJson<{ data: { preparationStages?: string[] } }>('/settings')
          .then((s) => setStages(s.data.preparationStages ?? []))
          .catch(() => setStages([]))

        let next = base
        // Coming back from the calculator ("custom item"): bring back what she had typed.
        if (restoreDraft) {
          try {
            const saved = sessionStorage.getItem(draftKey(orderId))
            if (saved) next = JSON.parse(saved) as FormState
          } catch {
            // an unreadable draft is just ignored
          }
        }

        if (addProductId) {
          const product = await apiJson<Product>(`/products/${addProductId}`)
          next = { ...next, lines: [...next.lines, lineFromProduct(product)] }
        }

        setState(next)
        setReady(true)
        if (restoreDraft || addProductId) replaceRoute(`/orders/${orderId ?? 'new'}`)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err))
      }
    }

    void init()
  }, [orderId, addProductId, restoreDraft])

  const locked = order?.isCompleted ?? false
  const dirty = snapshot(state) !== baseline.current

  const totals = useMemo(() => {
    const amount = state.lines.reduce((sum, line) => sum + lineTotal(line), 0)
    const value = Number(state.discountValue)
    let final = amount
    if (state.discountValue.trim() !== '' && Number.isFinite(value)) {
      final = state.discountMode === 'PERCENT' ? amount * (1 - value / 100) : value
    }
    final = Math.round(final * 100) / 100
    return { amount, final, discount: Math.round((amount - final) * 100) / 100 }
  }, [state.lines, state.discountMode, state.discountValue])

  function lineFromProduct(product: Product): Line {
    return {
      key: nextKey(),
      lineId: null,
      productId: product.id,
      name: product.name,
      material: product.material,
      unitPrice: String(product.sitePrice),
      quantity: '1',
    }
  }

  function patch(changes: Partial<FormState>) {
    setState((prev) => ({ ...prev, ...changes }))
  }

  function patchLine(key: string, changes: Partial<Line>) {
    setState((prev) => ({ ...prev, lines: prev.lines.map((l) => (l.key === key ? { ...l, ...changes } : l)) }))
  }

  function addProduct(product: Product) {
    setPicking(false)
    setState((prev) => {
      // The same product picked again just adds one to the line that isn't saved yet.
      const existing = prev.lines.find((l) => l.lineId === null && l.productId === product.id)
      if (existing) {
        return {
          ...prev,
          lines: prev.lines.map((l) => (l === existing ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l)),
        }
      }
      return { ...prev, lines: [...prev.lines, lineFromProduct(product)] }
    })
  }

  // A one-off item is made in the calculator (into the "custom order" collection), then comes back here.
  function addCustomItem() {
    sessionStorage.setItem(draftKey(orderId), JSON.stringify(state))
    const back = encodeURIComponent(`/orders/${orderId ?? 'new'}`)
    navigate(`/products/new?custom=1&returnTo=${back}`)
  }

  function validate(): string | null {
    if (state.lines.length === 0) return 'הוסיפי לפחות פריט אחד'
    for (const line of state.lines) {
      const quantity = Number(line.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) return `בדקי את הכמות של ${line.name}`
      const price = Number(line.unitPrice)
      if (line.unitPrice.trim() === '' || !Number.isFinite(price) || price < 0) return `בדקי את המחיר של ${line.name}`
    }
    if (state.discountValue.trim() !== '') {
      const value = Number(state.discountValue)
      if (!Number.isFinite(value) || value < 0) return 'בדקי את ההנחה'
      if (state.discountMode === 'PERCENT' && value > 100) return 'הנחה לא יכולה לעלות על 100%'
      if (state.discountMode === 'FINAL_AMOUNT' && value > totals.amount) return 'הסכום הסופי לא יכול להיות גבוה מסכום ההזמנה'
    }
    return null
  }

  async function save() {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }

    const body: SaveOrderBody = {
      customer: state.customer.trim() || null,
      date: state.date,
      notes: state.notes.trim() || null,
      items: state.lines.map((l) => ({
        lineId: l.lineId,
        productId: l.lineId ? null : l.productId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
      discount:
        state.discountValue.trim() === ''
          ? null
          : { mode: state.discountMode, value: Number(state.discountValue), reason: state.discountReason.trim() || null },
    }

    setSaving(true)
    setError(null)
    try {
      await apiJson<Order>(isNew ? '/orders' : `/orders/${orderId}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(body),
      })
      sessionStorage.removeItem(draftKey(orderId))
      navigate('/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
      setSaving(false)
    }
  }

  // Status, stage and receipt save on their own, right away, so they are blocked while there are
  // unsaved edits (otherwise the edits could be lost, e.g. when completing locks the order).
  async function act(request: () => Promise<Order>): Promise<Order | null> {
    setActionBusy(true)
    setError(null)
    try {
      const updated = await request()
      setOrder(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
      return null
    } finally {
      setActionBusy(false)
    }
  }

  const setStatus = (status: OrderStatus) =>
    act(() => apiJson<Order>(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }))

  // Completing locks the order, so it asks first; every other status changes at once.
  function changeStatus(status: OrderStatus) {
    if (status === 'COMPLETED') {
      setConfirmingComplete(true)
      return
    }
    void setStatus(status)
  }

  async function confirmComplete() {
    setConfirmingComplete(false)
    const done = await setStatus('COMPLETED')
    if (done) setCelebration(await completionMessage(done))
  }

  const pickStage = (stage: string) =>
    act(() => apiJson<Order>(`/orders/${orderId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }))
  const advanceStage = () => act(() => apiJson<Order>(`/orders/${orderId}/advance-stage`, { method: 'POST' }))
  const toggleReceipt = () =>
    act(() =>
      apiJson<Order>(`/orders/${orderId}/receipt-sent`, {
        method: 'PATCH',
        body: JSON.stringify({ receiptSent: !order?.receiptSent }),
      }),
    )

  async function remove() {
    try {
      await apiJson<void>(`/orders/${orderId}`, { method: 'DELETE' })
      sessionStorage.removeItem(draftKey(orderId))
      navigate('/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המחיקה נכשלה')
    }
  }

  if (loadError) {
    return (
      <div className="screen">
        <p style={errorTextStyle}>שגיאה בטעינה: {loadError}</p>
        <button type="button" onClick={() => navigate('/orders')} style={linkButtonStyle}>
          חזרה להזמנות
        </button>
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="screen">
        <p style={mutedTextStyle}>טוען...</p>
      </div>
    )
  }

  const actionsDisabled = dirty || actionBusy

  return (
    <div className="screen" style={{ paddingBottom: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => navigate('/orders')} aria-label="חזרה להזמנות" style={backButtonStyle}>
          <BackIcon />
        </button>
        <h1 style={{ flex: 1, margin: 0 }}>
          {order ? `הזמנה #${order.number}` : 'הזמנה חדשה'}
          {order?.isTest && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}> (הזמנת דמו)</span>}
        </h1>
        {order && <SourceBadge source={order.source} />}
        {!isNew && <ConfirmDeleteButton onConfirm={remove} ariaLabel="מחיקת ההזמנה" />}
      </header>

      {locked && (
        <p style={lockedStyle}>✓ ההזמנה הושלמה. היא נעולה לעריכה; כדי לערוך אותה, החזירי אותה לסטטוס קודם.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div>
            <label htmlFor="order-customer" style={fieldLabelStyle}>
              לקוחה
            </label>
            <input
              id="order-customer"
              value={state.customer}
              disabled={locked}
              onChange={(e) => patch({ customer: e.target.value })}
              style={fieldInputStyle}
            />
          </div>
          <div>
            <label htmlFor="order-date" style={fieldLabelStyle}>
              תאריך
            </label>
            <input
              id="order-date"
              type="date"
              value={state.date}
              disabled={locked}
              onChange={(e) => patch({ date: e.target.value })}
              style={fieldInputStyle}
            />
          </div>
        </div>

        <section style={cardStyle}>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>פריטים</h2>

          {state.lines.length === 0 && <p style={{ ...mutedTextStyle, marginBottom: 8 }}>עוד לא נוספו פריטים.</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.lines.map((line) => (
              <div key={line.key} style={lineStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{line.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {line.material}
                      {line.lineId ? ' · נשמר בהזמנה' : ''}
                    </div>
                  </div>
                  {!locked && (
                    <button
                      type="button"
                      aria-label={`הסרת ${line.name}`}
                      onClick={() => patch({ lines: state.lines.filter((l) => l.key !== line.key) })}
                      style={removeLineStyle}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', marginTop: 6 }}>
                  <div>
                    <label style={fieldLabelStyle}>מחיר ליחידה</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={line.unitPrice}
                      disabled={locked}
                      onChange={(e) => patchLine(line.key, { unitPrice: e.target.value })}
                      style={smallInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>כמות</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={line.quantity}
                      disabled={locked}
                      onChange={(e) => patchLine(line.key, { quantity: e.target.value })}
                      style={smallInputStyle}
                    />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, paddingBottom: 10 }}>{formatMoney(lineTotal(line))}</div>
                </div>
              </div>
            ))}
          </div>

          {!locked && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setPicking(true)} style={{ ...secondaryButtonStyle, flex: 1 }}>
                + מוצר מהקטלוג
              </button>
              <button type="button" onClick={addCustomItem} style={{ ...secondaryButtonStyle, flex: 1 }}>
                + פריט אישי
              </button>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>הנחה</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['PERCENT', 'FINAL_AMOUNT'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={locked}
                onClick={() => patch({ discountMode: mode, discountValue: '' })}
                aria-pressed={state.discountMode === mode}
                style={modeStyle(state.discountMode === mode)}
              >
                {mode === 'PERCENT' ? 'באחוזים' : 'סכום סופי'}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={state.discountValue}
            disabled={locked}
            onChange={(e) => patch({ discountValue: e.target.value })}
            placeholder={state.discountMode === 'PERCENT' ? 'אחוז הנחה' : 'הסכום שהלקוחה משלמת'}
            aria-label="ערך ההנחה"
            style={fieldInputStyle}
          />
          {totals.discount > 0 && (
            <>
              <p style={{ ...mutedTextStyle, marginTop: 6 }}>
                הנחה של {formatMoney(totals.discount)} ({totals.amount > 0 ? Math.round((totals.discount / totals.amount) * 1000) / 10 : 0}%)
              </p>
              <input
                value={state.discountReason}
                disabled={locked}
                onChange={(e) => patch({ discountReason: e.target.value })}
                placeholder="סיבת ההנחה (לא חובה)"
                aria-label="סיבת ההנחה"
                style={{ ...fieldInputStyle, marginTop: 6 }}
              />
            </>
          )}
        </section>

        <div>
          <label htmlFor="order-notes" style={fieldLabelStyle}>
            הערות
          </label>
          <textarea
            id="order-notes"
            rows={2}
            value={state.notes}
            disabled={locked}
            onChange={(e) => patch({ notes: e.target.value })}
            style={{ ...fieldInputStyle, minHeight: 64, resize: 'vertical' }}
          />
        </div>

        {order && (
          <section style={cardStyle}>
            <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>סטטוס</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {STATUS_ORDER.map((status) => {
                const active = order.status === status
                // Completing needs the receipt; the reason is written right below.
                const blocked = status === 'COMPLETED' && !order.receiptSent
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={actionsDisabled || blocked}
                    aria-pressed={active}
                    onClick={() => !active && changeStatus(status)}
                    style={statusButtonStyle(status, active)}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                )
              })}
            </div>

            {!order.receiptSent && !order.isCompleted && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--danger)' }}>יש לסמן שנשלחה קבלה כדי לסיים את ההזמנה.</p>
            )}

            {confirmingComplete && (
              <ConfirmInline
                message="לסמן את ההזמנה כהושלמה? היא תינעל לעריכה."
                confirmLabel="כן, להשלים"
                busy={actionBusy}
                onConfirm={confirmComplete}
                onCancel={() => setConfirmingComplete(false)}
              />
            )}

            {order.status === 'IN_PROGRESS' && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 14 }}>שלב הכנה</span>
                <StageChips stages={stages} current={order.preparationStage} disabled={actionsDisabled} onPick={pickStage} />
                <button type="button" onClick={advanceStage} disabled={actionsDisabled} style={secondaryButtonStyle}>
                  לשלב הבא ←
                </button>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 15 }}>
              <input
                type="checkbox"
                checked={order.receiptSent}
                disabled={actionsDisabled || order.isCompleted}
                onChange={toggleReceipt}
              />
              קבלה נשלחה
            </label>

            {dirty && <p style={{ ...mutedTextStyle, marginTop: 8 }}>יש שינויים שלא נשמרו. שמרי אותם כדי לשנות סטטוס או קבלה.</p>}
          </section>
        )}
      </div>

      <div style={barStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            סה"כ לתשלום
            {totals.discount > 0 && (
              <span style={{ textDecoration: 'line-through', marginInlineStart: 8 }}>{formatMoney(totals.amount)}</span>
            )}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{formatMoney(totals.final)}</span>
        </div>
        {error && <p style={{ ...errorTextStyle, margin: '4px 0' }}>{error}</p>}
        {!locked && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{ ...primaryButtonStyle, width: '100%', marginTop: 6, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'שומר...' : isNew ? 'יצירת הזמנה' : 'שמירת שינויים'}
          </button>
        )}
      </div>

      {celebration && <Toast lines={celebration} onDone={() => setCelebration(null)} />}

      {picking && <ProductPicker onPick={addProduct} onClose={() => setPicking(false)} />}
    </div>
  )
}

function modeStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-bg)' : 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: 14,
    cursor: 'pointer',
  }
}

function statusButtonStyle(status: OrderStatus, active: boolean): React.CSSProperties {
  const colors = statusColors(status)
  return {
    minHeight: 40,
    borderRadius: 8,
    border: `1px solid ${active ? colors.color : 'var(--border)'}`,
    background: active ? colors.background : 'var(--surface)',
    color: active ? colors.color : 'var(--text)',
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
  }
}

const backButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: 'none',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const lockedStyle: React.CSSProperties = {
  margin: '0 0 12px',
  padding: '8px 12px',
  borderRadius: 8,
  background: 'var(--success-bg)',
  color: 'var(--success)',
  fontSize: 14,
  fontWeight: 600,
}

const lineStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
}

const smallInputStyle: React.CSSProperties = {
  ...fieldInputStyle,
  minHeight: 40,
  padding: '4px 8px',
  fontSize: 15,
  textAlign: 'center',
}

const removeLineStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: 'none',
  borderRadius: 8,
  background: 'var(--danger-bg)',
  color: 'var(--danger)',
  cursor: 'pointer',
  flexShrink: 0,
}

const barStyle: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  marginInline: -16,
  marginTop: 16,
  padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
}

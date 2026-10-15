import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '../api'
import { cardStyle, errorTextStyle, mutedTextStyle, primaryButtonStyle } from '../products/productStyles'
import { navigate } from '../shell/useRoute'
import { defaultGroupFor, loadCategoryGroups, saveCategoryGroups } from './defaultGroup'
import { selectStyle } from './styles'
import type { FinanceItem, FinanceList } from './types'

type Category = {
  // '' is the group of expenses with no category.
  name: string
  items: FinanceItem[]
}

// Puts every expense of a category into one group, all at once. She chooses the group for each category,
// sees how many expenses would change, and applies it. Her choices are remembered as the default.
export function GroupMappingPage() {
  const [expenses, setExpenses] = useState<FinanceItem[] | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const [settings, years] = await Promise.all([
        apiJson<{ data: { expenseGroups?: string[] } }>('/settings'),
        apiJson<number[]>('/finances/years'),
      ])
      const lists = await Promise.all(years.map((y) => apiJson<FinanceList>(`/finances?from=${y}-01-01&to=${y}-12-31`)))
      const all = lists.flatMap((l) => l.items).filter((i) => i.kind === 'EXPENSE' && !i.isProjected)
      const groupNames = settings.data.expenseGroups ?? []
      setGroups(groupNames)
      setExpenses(all)

      // The starting choice per category: what she chose before, else the words, else leave as is.
      const start: Record<string, string> = {}
      for (const name of new Set(all.map((e) => e.typeName ?? ''))) start[name] = defaultGroupFor(name, groupNames)
      setChoice(start)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הטעינה נכשלה')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const categories: Category[] = useMemo(() => {
    const byName = new Map<string, FinanceItem[]>()
    for (const e of expenses ?? []) {
      const key = e.typeName ?? ''
      byName.set(key, [...(byName.get(key) ?? []), e])
    }
    return [...byName.entries()].map(([name, items]) => ({ name, items })).sort((a, b) => b.items.length - a.items.length)
  }, [expenses])

  const changes = categories.flatMap((c) => {
    const target = choice[c.name] ?? ''
    return target ? c.items.filter((e) => (e.groupName ?? '') !== target).map((e) => ({ item: e, target })) : []
  })

  async function apply() {
    if (changes.length === 0) return
    if (!window.confirm(`לעדכן את הקבוצה של ${changes.length} הוצאות? זה גם דורס שיוך שכבר נקבע.`)) return

    setBusy(true)
    setError(null)
    setMessage(null)

    // Within a recurring series the latest occurrence also updates the series, so later ones follow.
    const latestOfSeries = new Map<string, string>()
    for (const e of expenses ?? []) {
      if (!e.seriesId) continue
      const current = (expenses ?? []).find((x) => x.id === latestOfSeries.get(e.seriesId!))
      if (!current || e.date > current.date) latestOfSeries.set(e.seriesId, e.id)
    }

    let done = 0
    let failed = 0
    for (const { item, target } of changes) {
      setProgress(`מעדכן ${done + failed + 1} מתוך ${changes.length}`)
      try {
        await apiJson(`/expenses/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            date: item.date,
            category: item.expenseCategory,
            description: item.description,
            amount: item.amount,
            typeName: item.typeName,
            groupName: target,
            supplier: item.supplier,
            notes: item.notes,
            orderId: item.orderId,
            applyToSeries: item.seriesId != null && latestOfSeries.get(item.seriesId) === item.id,
          }),
        })
        done += 1
      } catch {
        failed += 1
      }
    }

    // Remember her choices so new expenses and receipts start in the same group.
    const saved = loadCategoryGroups()
    for (const [name, group] of Object.entries(choice)) if (name && group) saved[name] = group
    saveCategoryGroups(saved)

    setProgress('')
    setBusy(false)
    setMessage(failed > 0 ? `עודכנו ${done} הוצאות, ${failed} נכשלו. אפשר ללחוץ שוב.` : `עודכנו ${done} הוצאות`)
    await load()
  }

  return (
    <div className="screen">
      <button
        type="button"
        onClick={() => navigate('/finances/analysis')}
        style={{ border: 'none', background: 'transparent', color: 'var(--accent)', padding: 0, fontSize: 14, cursor: 'pointer' }}
      >
        ← חזרה לניתוח
      </button>
      <h1 style={{ margin: '4px 0 4px' }}>שיוך קטגוריות לקבוצות</h1>
      <p style={{ ...mutedTextStyle, margin: '0 0 10px' }}>
        לכל קטגוריה בוחרים קבוצה, וכל ההוצאות שלה עוברות אליה, גם כאלה ששויכו קודם. "לא לשנות" משאיר את ההוצאות כמו שהן.
      </p>

      {error && <p style={errorTextStyle}>{error}</p>}
      {!expenses && !error && <p style={mutedTextStyle}>טוען...</p>}

      {expenses && categories.length === 0 && <p style={mutedTextStyle}>אין הוצאות.</p>}

      {categories.map((c) => {
        const target = choice[c.name] ?? ''
        const willChange = target ? c.items.filter((e) => (e.groupName ?? '') !== target).length : 0
        const now = countBy(c.items.map((e) => e.groupName || 'ללא קבוצה'))
        return (
          <div key={c.name || 'none'} style={{ ...cardStyle, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ fontWeight: 600 }}>{c.name || 'ללא קטגוריה'}</b>
              <span style={mutedTextStyle}>{c.items.length} הוצאות</span>
            </div>
            <div style={{ ...mutedTextStyle, margin: '2px 0 8px' }}>כרגע: {now}</div>
            <select
              value={target}
              onChange={(e) => setChoice((current) => ({ ...current, [c.name]: e.target.value }))}
              disabled={busy}
              style={selectStyle}
              aria-label={`קבוצה עבור ${c.name || 'ללא קטגוריה'}`}
            >
              <option value="">לא לשנות</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {willChange > 0 && <div style={{ ...mutedTextStyle, color: 'var(--warning)', marginTop: 4 }}>{willChange} ישתנו</div>}
          </div>
        )
      })}

      {message && <p style={{ fontWeight: 600 }}>{message}</p>}

      {expenses && categories.length > 0 && (
        <button
          type="button"
          disabled={busy || changes.length === 0}
          onClick={() => void apply()}
          style={{ ...primaryButtonStyle, width: '100%', marginTop: 8, opacity: busy || changes.length === 0 ? 0.6 : 1 }}
        >
          {busy ? progress || 'מעדכן...' : `החלה על ${changes.length} הוצאות`}
        </button>
      )}
    </div>
  )
}

function countBy(values: string[]): string {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].map(([name, n]) => `${name} ${n}`).join(' · ')
}

import { useEffect, useRef, useState } from 'react'
import { apiFetch, apiJson } from '../api'
import type { Collection } from '../products/types'
import { cellInputStyle, statusTextStyle } from './formStyles'
import { Section } from './Section'

type Status = 'idle' | 'saving' | 'saved' | 'error'

// Total work hours per piece for a whole collection (engagement rings: 3.5). Empty = the usual material
// hours plus the product's own extra hours. Saves a changed value after a short pause, like the other sections.
export function CollectionHoursForm() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('idle')
  const saved = useRef<Record<string, string>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    apiJson<Collection[]>('/collections')
      .then((list) => {
        const initial: Record<string, string> = {}
        for (const c of list) initial[c.id] = c.fixedWorkHours != null ? String(c.fixedWorkHours) : ''
        saved.current = { ...initial }
        setCollections(list.filter((c) => c.key !== 'general' && c.key !== 'customOrder'))
        setValues(initial)
      })
      .catch(() => setStatus('error'))
  }, [])

  async function save(id: string, text: string) {
    const hours = text.trim() === '' ? null : Number(text)
    if (hours !== null && !(hours > 0)) return
    setStatus('saving')
    try {
      const res = await apiFetch(`/collections/${id}/work-hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixedWorkHours: hours }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      saved.current[id] = text
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  function change(id: string, text: string) {
    setValues((prev) => ({ ...prev, [id]: text }))
    clearTimeout(timers.current[id])
    if (text === saved.current[id]) return
    timers.current[id] = setTimeout(() => void save(id, text), 800)
  }

  if (collections.length === 0) return null

  return (
    <Section title="שעות עבודה לקולקציה">
      <p style={{ ...statusTextStyle, margin: '0 0 8px' }}>
        סך שעות העבודה לתכשיט בקולקציה, כולל שעות החומר. כשמוגדר מספר, הוא מחליף את שעות החומר והשעות הנוספות של כל
        המוצרים בקולקציה. ריק = חישוב רגיל.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 4, alignItems: 'center' }}>
        {collections.map((c) => (
          <div key={c.id} style={{ display: 'contents' }}>
            <span style={{ fontSize: 14, borderBottom: '1px solid var(--border)', padding: '8px 6px' }}>{c.name}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              value={values[c.id] ?? ''}
              onChange={(e) => change(c.id, e.target.value)}
              placeholder="רגיל"
              aria-label={`סך שעות עבודה ל${c.name}`}
              style={{ ...cellInputStyle, borderBottom: '1px solid var(--border)' }}
            />
          </div>
        ))}
      </div>
      {status === 'saving' && <p style={statusTextStyle}>שומר...</p>}
      {status === 'saved' && <p style={statusTextStyle}>נשמר. מוצרי הקולקציה עודכנו.</p>}
      {status === 'error' && <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>השמירה נכשלה, נסי שוב.</p>}
    </Section>
  )
}

import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { TrashIcon } from '../icons/TrashIcon'
import { statusTextStyle } from './formStyles'
import { Section } from './Section'

type Collection = {
  id: string
  name: string
  isPermanent: boolean
}

export function CollectionsForm() {
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    apiFetch('/collections')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setCollections)
      .catch((err) => setError(String(err)))
  }

  useEffect(load, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const res = await apiFetch('/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNewName('')
      load()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(id: string) {
    setBusy(true)
    try {
      const res = await apiFetch(`/collections/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      load()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <Section title="קולקציות">
        <p style={{ ...statusTextStyle, color: 'var(--danger)' }}>שגיאה: {error}</p>
      </Section>
    )
  }
  if (!collections) {
    return (
      <Section title="קולקציות">
        <p style={statusTextStyle}>טוען קולקציות...</p>
      </Section>
    )
  }

  return (
    <Section title="קולקציות">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {collections.map((collection) => (
          <span key={collection.id} style={chipStyle}>
            {collection.name}
            {!collection.isPermanent && (
              <button
                type="button"
                onClick={() => handleRemove(collection.id)}
                disabled={busy}
                aria-label={`הסר את ${collection.name}`}
                style={chipRemoveButtonStyle}
              >
                <TrashIcon />
              </button>
            )}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="שם קולקציה חדשה"
          aria-label="שם קולקציה חדשה"
          style={newCollectionInputStyle}
        />
        <button type="button" onClick={handleAdd} disabled={busy || !newName.trim()} style={addButtonStyle}>
          + הוספה
        </button>
      </div>
    </Section>
  )
}

const newCollectionInputStyle = {
  flex: 1,
  minHeight: 44,
  padding: '8px 12px',
  fontSize: 15,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text)',
} as const

const addButtonStyle = {
  minHeight: 44,
  padding: '0 16px',
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
} as const

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 8,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 14,
  fontWeight: 500,
} as const

const chipRemoveButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: 0,
} as const

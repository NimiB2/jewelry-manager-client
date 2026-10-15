import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { apiJson } from '../api'
import { todayIso } from '../orders/dates'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import { SubNav } from '../shell/SubNav'
import { subItemsOf } from '../shell/navItems'
import { attachInvoice, isInvoiceReaderAvailable, readInvoice } from './invoiceApi'
import { defaultGroupFor } from './defaultGroup'
import { loadStash, saveStash } from './receiptStash'
import type { FinanceList } from './types'

type RowStatus = 'reading' | 'ready' | 'saving' | 'saved' | 'failed'

type Row = {
  key: string
  file: File
  status: RowStatus
  include: boolean
  amount: string
  date: string
  description: string
  supplier: string
  typeName: string
  groupName: string
  // She chose the group herself, so the category-based default must not overwrite it.
  groupManual?: boolean
  // Why the row needs attention: a failed read or save, or a looks-like-a-duplicate hint.
  note: string | null
  duplicate: boolean
}

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf']
const MAX_BYTES = 10 * 1024 * 1024
const READ_CONCURRENCY = 2

// Drops a whole folder (or many files) of receipts at once. Each one is read, shown for a quick check,
// and only then saved as an expense with the file attached.
export function ReceiptsImportPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [skipped, setSkipped] = useState(0)
  const [readerAvailable, setReaderAvailable] = useState<boolean | null>(null)
  const [types, setTypes] = useState<string[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [bulkGroup, setBulkGroup] = useState('')
  const [checked, setChecked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const queue = useRef<Row[]>([])
  const running = useRef(0)

  // Receipts left over from an earlier visit come back, so nothing has to be uploaded twice.
  useEffect(() => {
    loadStash<Row>()
      .then((stashed) => {
        if (stashed.length === 0) return
        const pending = stashed.filter((r) => r.status !== 'saved')
        // One that was still being read when the screen closed is read again.
        const revived = pending.map((r) => (r.status === 'saving' ? { ...r, status: 'ready' as const } : r))
        setRows(revived)
        setChecked(false)
        queue.current.push(...revived.filter((r) => r.status === 'reading'))
        pump()
      })
      .finally(() => setRestored(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The group follows the category (materials and stones are order costs, packaging and shipping are
  // business costs) until she picks one herself. This also covers receipts restored from before.
  useEffect(() => {
    if (groups.length === 0) return
    setRows((current) => {
      let changed = false
      const next = current.map((r) => {
        if (r.status === 'saved' || r.groupManual) return r
        const wanted = defaultGroupFor(r.typeName, groups)
        if (!wanted || wanted === r.groupName) return r
        changed = true
        return { ...r, groupName: wanted }
      })
      return changed ? next : current
    })
  }, [rows, groups])

  useEffect(() => {
    if (!restored) return
    const timer = window.setTimeout(() => void saveStash(rows.filter((r) => r.status !== 'saved')), 500)
    return () => window.clearTimeout(timer)
  }, [rows, restored])

  useEffect(() => {
    isInvoiceReaderAvailable().then(setReaderAvailable).catch(() => setReaderAvailable(false))
    apiJson<{ data: { expenseTypes?: string[]; expenseGroups?: string[] } }>('/settings')
      .then((s) => {
        setTypes(s.data.expenseTypes ?? [])
        setGroups(s.data.expenseGroups ?? [])
      })
      .catch(() => {})
  }, [])

  function patch(key: string, changes: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...changes } : r)))
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const files = Array.from(list)
    const accepted = files.filter((f) => ALLOWED.some((ext) => f.name.toLowerCase().endsWith(ext)) && f.size > 0 && f.size <= MAX_BYTES)
    setSkipped((n) => n + files.length - accepted.length)
    setSummary(null)
    setError(null)
    setChecked(false)

    const added: Row[] = accepted.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      status: 'reading',
      include: true,
      amount: '',
      date: dateOf(file),
      description: '',
      supplier: '',
      typeName: '',
      groupName: bulkGroup,
      note: null,
      duplicate: false,
    }))
    setRows((current) => [...current, ...added])
    queue.current.push(...added)
    pump()
  }

  // Reads the receipts a couple at a time, so a big folder neither floods the reader nor the phone.
  function pump() {
    while (running.current < READ_CONCURRENCY && queue.current.length > 0) {
      const row = queue.current.shift()!
      running.current += 1
      void readOne(row).finally(() => {
        running.current -= 1
        pump()
      })
    }
  }

  async function readOne(row: Row) {
    try {
      const found = await readInvoice(row.file)
      if (!found) {
        patch(row.key, { status: 'ready', note: 'לא נקרא, צריך למלא ידנית' })
        return
      }
      patch(row.key, {
        status: 'ready',
        amount: found.amount !== null ? String(found.amount) : '',
        date: found.date ?? row.date,
        supplier: found.supplier ?? '',
        description: found.description ?? '',
        typeName: found.typeName ?? '',
        note: found.amount === null ? 'הסכום לא נקרא, צריך למלא' : null,
      })
    } catch {
      patch(row.key, { status: 'ready', note: 'הקריאה האוטומטית נכשלה, צריך למלא ידנית' })
    }
  }

  // Once every receipt is read, one look at the books for expenses with the same date and amount.
  const doneReading = rows.length > 0 && rows.every((r) => r.status !== 'reading')
  useEffect(() => {
    if (!doneReading || checked) return
    setChecked(true)
    const dates = rows.map((r) => r.date).filter(Boolean).sort()
    if (dates.length === 0) return
    apiJson<FinanceList>(`/finances?from=${dates[0]}&to=${dates[dates.length - 1]}`)
      .then((list) => {
        const existing = list.items.filter((i) => i.kind === 'EXPENSE')
        setRows((current) =>
          current.map((r) => {
            const duplicate =
              r.status === 'ready' &&
              Number(r.amount) > 0 &&
              existing.some((e) => e.date === r.date && Math.abs(e.amount - Number(r.amount)) < 0.005)
            // A suspected duplicate starts unchecked, so saving everything does not add it twice.
            return { ...r, duplicate, include: duplicate && !r.duplicate ? false : r.include }
          }),
        )
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneReading, checked])

  function applyBulkGroup(value: string) {
    setBulkGroup(value)
    setRows((current) => current.map((r) => (r.status === 'saved' ? r : { ...r, groupName: value, groupManual: value !== '' })))
  }

  async function saveAll() {
    setSaving(true)
    setError(null)
    setSummary(null)
    let saved = 0
    let attachFailed = 0
    let failed = 0

    for (const row of rows) {
      if (!row.include || row.status === 'saved' || row.status === 'reading') continue

      const amount = Number(row.amount)
      const text = row.description.trim() || row.supplier.trim() || row.typeName
      if (!Number.isFinite(amount) || amount <= 0 || !row.date || !text) {
        patch(row.key, { status: 'failed', note: 'חסר סכום, תאריך או שם' })
        failed += 1
        continue
      }

      patch(row.key, { status: 'saving' })
      try {
        const created = await apiJson<{ id: string }>('/expenses', {
          method: 'POST',
          body: JSON.stringify({
            date: row.date,
            category: 'VARIABLE',
            description: text,
            amount,
            typeName: row.typeName || null,
            groupName: row.groupName || null,
            supplier: row.supplier.trim() || null,
            repeatEveryMonths: null,
          }),
        })
        try {
          await attachInvoice(created.id, row.file)
          patch(row.key, { status: 'saved', note: null })
        } catch {
          attachFailed += 1
          patch(row.key, { status: 'saved', note: 'ההוצאה נשמרה, אבל צירוף הקובץ נכשל' })
        }
        saved += 1
      } catch (err) {
        failed += 1
        patch(row.key, { status: 'failed', note: err instanceof Error ? err.message : 'השמירה נכשלה' })
      }
    }

    setSaving(false)
    // What was saved leaves the list; only receipts that still need her attention stay.
    setRows((current) => current.filter((r) => r.status !== 'saved'))
    const parts = [`נשמרו ${saved} הוצאות`]
    if (attachFailed > 0) parts.push(`${attachFailed} בלי קובץ מצורף`)
    if (failed > 0) parts.push(`${failed} לא נשמרו, אפשר לתקן ולנסות שוב`)
    setSummary(parts.join(' · '))
  }

  function remove(key: string) {
    queue.current = queue.current.filter((r) => r.key !== key)
    setRows((current) => current.filter((r) => r.key !== key))
  }

  function clearAll() {
    if (!window.confirm('להסיר את כל הקבלות שברשימה? ההוצאות שכבר נשמרו לא יושפעו.')) return
    queue.current = []
    setRows([])
    setSummary(null)
  }

  const pending = rows.filter((r) => r.status !== 'saved')
  const toSave = pending.filter((r) => r.include && r.status !== 'reading')
  const total = toSave.reduce((sum, r) => sum + (Number(r.amount) > 0 ? Number(r.amount) : 0), 0)
  const readingCount = rows.filter((r) => r.status === 'reading').length

  return (
    <div className="screen">
      <h1 style={{ margin: '0 0 8px' }}>כספים</h1>
      <SubNav items={subItemsOf('finances', { page: 'finances', view: 'receipts' })} />

      <div style={{ ...cardStyle, margin: '10px 0' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>ייבוא קבלות</div>
        <p style={{ ...mutedTextStyle, margin: '0 0 10px' }}>
          בחרי תיקייה או כמה קבצים (תמונה או PDF). כל קבלה נקראת ומוצגת לבדיקה, ורק אחרי אישור היא נשמרת כהוצאה.
        </p>
        {readerAvailable === false && (
          <p style={{ ...errorTextStyle, margin: '0 0 8px' }}>הקריאה האוטומטית לא מחוברת, צריך למלא סכום ותאריך ידנית.</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ ...secondaryButtonStyle, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            בחירת תיקייה
            <input
              type="file"
              multiple
              // Not in the DOM typings, but supported by every current browser.
              {...({ webkitdirectory: '' } as Record<string, string>)}
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
              style={{ display: 'none' }}
            />
          </label>
          <label style={{ ...secondaryButtonStyle, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            בחירת קבצים
            <input
              type="file"
              multiple
              accept={ALLOWED.join(',')}
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {skipped > 0 && (
          <p style={{ ...mutedTextStyle, margin: '8px 0 0' }}>{skipped} קבצים דולגו (סוג לא נתמך או גדול מ-10MB).</p>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>קבוצה לכולן</span>
            <select value={bulkGroup} onChange={(e) => applyBulkGroup(e.target.value)} style={{ ...fieldInputStyle, minHeight: 40, fontSize: 14 }}>
              <option value="">ללא קבוצה</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>{rows.length} קבלות ממתינות</span>
            <button type="button" onClick={clearAll} disabled={saving} style={{ ...mutedTextStyle, border: 'none', background: 'transparent', cursor: 'pointer', textDecoration: 'underline' }}>
              ניקוי הרשימה
            </button>
          </div>

          {readingCount > 0 && <p style={mutedTextStyle}>קורא קבלות... נשארו {readingCount}</p>}

          {rows.map((row) => (
            <ReceiptCard
              key={row.key}
              row={row}
              types={types}
              groups={groups}
              disabled={saving}
              onChange={(changes) => patch(row.key, { ...changes, duplicate: false })}
              onRemove={() => remove(row.key)}
            />
          ))}

          {error && <p style={errorTextStyle}>{error}</p>}
          {summary && <p style={{ fontWeight: 600 }}>{summary}</p>}

          {pending.length > 0 && (
            <button
              type="button"
              disabled={saving || readingCount > 0 || toSave.length === 0}
              onClick={() => void saveAll()}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: 8, opacity: saving || readingCount > 0 || toSave.length === 0 ? 0.6 : 1 }}
            >
              {saving ? 'שומר...' : `שמירת ${toSave.length} הוצאות · ${formatMoney(total)}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// The date a receipt most likely belongs to when the reader finds none: when the file was last changed.
function dateOf(file: File): string {
  const d = new Date(file.lastModified)
  if (Number.isNaN(d.getTime())) return todayIso()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type CardProps = {
  row: Row
  types: string[]
  groups: string[]
  disabled: boolean
  onChange: (changes: Partial<Row>) => void
  onRemove: () => void
}

function ReceiptCard({ row, types, groups, disabled, onChange, onRemove }: CardProps) {
  const locked = disabled || row.status === 'reading' || row.status === 'saving' || row.status === 'saved'
  const border =
    row.status === 'failed' ? 'var(--danger)' : row.duplicate ? 'var(--warning)' : 'transparent'

  return (
    <div style={{ ...cardStyle, marginBottom: 8, border: `1px solid ${border}`, opacity: row.status === 'saved' ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input
          type="checkbox"
          checked={row.include && row.status !== 'saved'}
          disabled={locked}
          onChange={(e) => onChange({ include: e.target.checked })}
          aria-label="לכלול בשמירה"
          style={{ width: 20, height: 20 }}
        />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">
          {row.file.name}
        </span>
        <span style={{ ...mutedTextStyle, whiteSpace: 'nowrap' }}>{STATUS_LABEL[row.status]}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={row.status === 'saving'}
          aria-label="הסרת הקבלה מהרשימה"
          style={{ border: 'none', background: 'transparent', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}
        >
          ×
        </button>
      </div>

      {row.status !== 'reading' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="סכום"
              value={row.amount}
              disabled={locked}
              onChange={(e) => onChange({ amount: e.target.value })}
              style={smallField}
            />
            <input type="date" value={row.date} disabled={locked} onChange={(e) => onChange({ date: e.target.value })} style={smallField} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <input
              placeholder="ספק"
              value={row.supplier}
              disabled={locked}
              onChange={(e) => onChange({ supplier: e.target.value })}
              style={smallField}
            />
            <input
              placeholder="תיאור"
              value={row.description}
              disabled={locked}
              onChange={(e) => onChange({ description: e.target.value })}
              style={smallField}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <select value={row.typeName} disabled={locked} onChange={(e) => onChange({ typeName: e.target.value })} style={smallField}>
              <option value="">קטגוריה</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={row.groupName} disabled={locked} onChange={(e) => onChange({ groupName: e.target.value, groupManual: true })} style={smallField}>
              <option value="">ללא קבוצה</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {row.duplicate && (
        <p style={{ ...mutedTextStyle, color: 'var(--warning)', margin: '6px 0 0' }}>נראית כמו הוצאה שכבר קיימת (אותו תאריך וסכום), לכן לא סומנה לשמירה.</p>
      )}
      {row.note && <p style={{ ...errorTextStyle, margin: '6px 0 0' }}>{row.note}</p>}
    </div>
  )
}

const STATUS_LABEL: Record<RowStatus, string> = {
  reading: 'נקראת...',
  ready: 'מוכנה',
  saving: 'נשמרת...',
  saved: 'נשמרה',
  failed: 'נכשלה',
}

const smallField: CSSProperties = { ...fieldInputStyle, minHeight: 40, fontSize: 14, minWidth: 0 }

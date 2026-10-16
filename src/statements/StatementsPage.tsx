import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '../api'
import { formatOrderDate } from '../orders/dates'
import { formatMoney } from '../products/format'
import { cardStyle, errorTextStyle, fieldInputStyle, linkButtonStyle, mutedTextStyle, primaryButtonStyle, secondaryButtonStyle } from '../products/productStyles'
import { FilterTabs } from '../shell/FilterTabs'
import { subItemsOf } from '../shell/navItems'
import { SubNav } from '../shell/SubNav'
import { LineCard } from './LineCard'
import * as api from './statementsApi'
import type { MonthCheck, StatementFile, StatementLine } from './types'

type Tab = 'todo' | 'done' | 'ignored'

// Last month, the one usually being closed.
function lastMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Bank and credit card statements as a checklist: every line must end as matched to an expense she
// already entered, as a new expense, or as not an expense. Only then can the month be closed.
export function StatementsPage() {
  const [month, setMonth] = useState(lastMonth)
  const [lines, setLines] = useState<StatementLine[]>([])
  const [check, setCheck] = useState<MonthCheck | null>(null)
  const [files, setFiles] = useState<StatementFile[]>([])
  const [tab, setTab] = useState<Tab>('todo')
  const [types, setTypes] = useState<string[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [source, setSource] = useState<'Bank' | 'Card'>('Card')
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [keywords, setKeywords] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [l, c, f] = await Promise.all([api.getLines(month), api.getMonth(month), api.getFiles()])
      setLines(l)
      setCheck(c)
      setFiles(f)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הטעינה נכשלה')
    }
  }, [month])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    apiJson<{ data: { expenseTypes?: string[]; expenseGroups?: string[] } }>('/settings')
      .then((s) => {
        setTypes(s.data.expenseTypes ?? [])
        setGroups(s.data.expenseGroups ?? [])
      })
      .catch(() => {})
  }, [])

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setNotice(null)
    setError(null)
    try {
      const r = await api.uploadStatement(file, source)
      const parts = [`נקראו ${r.added} שורות חדשות`]
      if (r.fileWasAlreadyUploaded) parts.unshift('הקובץ כבר הועלה, נקרא שוב')
      if (r.alreadyKnown > 0) parts.push(`${r.alreadyKnown} כבר היו מדף קודם`)
      if (r.cardSettlements > 0) parts.push(`${r.cardSettlements} חיובי אשראי`)
      if (r.autoIgnored > 0) parts.push(`${r.autoIgnored} כסף שנכנס (הוזנו כ"לא הוצאה")`)
      parts.push(`${r.pending} ממתינות להחלטה`)
      setNotice(parts.join(' · '))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההעלאה נכשלה')
    } finally {
      setUploading(false)
    }
  }

  // Each decision refreshes the lines and the month status, so the counters never lag behind.
  const decide = (action: () => Promise<unknown>) => async () => {
    await action()
    await reload()
  }

  async function removeFile(f: StatementFile) {
    if (!window.confirm(`למחוק את "${f.fileName}"? הוצאות שנוצרו ממנו יישארו.`)) return
    try {
      await api.deleteFile(f.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המחיקה נכשלה')
    }
  }

  async function clearOpen() {
    if (!window.confirm('למחוק את כל השורות של החודש שעוד לא הפכו להוצאה (ממתינות ו"לא הוצאה")? אחר כך אפשר להעלות את הקובץ שוב. הוצאות לא נמחקות.')) return
    try {
      const { deleted } = await api.clearOpenLines(month)
      setNotice(`נמחקו ${deleted} שורות. אפשר להעלות את הקובץ מחדש`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המחיקה נכשלה')
    }
  }

  async function toggleClose() {
    if (!check) return
    try {
      if (check.isClosed) await api.reopenMonth(month)
      else await api.closeMonth(month)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    }
  }

  async function openKeywords() {
    setKeywords((await api.getKeywords()).join(', '))
  }

  async function saveKeywords() {
    if (keywords === null) return
    try {
      const saved = await api.saveKeywords(keywords.split(',').map((k) => k.trim()))
      setKeywords(saved.join(', '))
      setNotice('המילים נשמרו. חלות על קבצים שיעלו מעכשיו')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    }
  }

  const todo = lines.filter((l) => l.status === 'PENDING' || (l.status === 'CARD_SETTLEMENT' && !l.coveredByCardStatement))
  const done = lines.filter((l) => l.status === 'MATCHED' || l.status === 'CREATED' || (l.status === 'CARD_SETTLEMENT' && l.coveredByCardStatement))
  const ignored = lines.filter((l) => l.status === 'IGNORED')
  const shown = tab === 'todo' ? todo : tab === 'done' ? done : ignored
  const locked = check?.isClosed ?? false

  return (
    <div className="screen">
      <h1 style={{ margin: '0 0 8px' }}>כספים</h1>
      <SubNav items={subItemsOf('finances', { page: 'finances', view: 'statements' })} />

      <div style={{ ...cardStyle, margin: '10px 0' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>העלאת דף בנק או אשראי</div>
        <p style={{ ...mutedTextStyle, margin: '0 0 10px' }}>
          קובץ Excel או CSV שהורדת מהבנק או מחברת האשראי. השורות לא נכנסות כהוצאות עד שתאשרי כל אחת.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={source} onChange={(e) => setSource(e.target.value as 'Bank' | 'Card')} style={{ ...fieldInputStyle, flex: 1, minHeight: 44 }} aria-label="סוג הדף">
            <option value="Card">דף אשראי</option>
            <option value="Bank">דף בנק</option>
          </select>
          <label style={{ ...secondaryButtonStyle, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'קורא...' : 'בחירת קובץ'}
            <input
              type="file"
              accept=".xlsx,.csv"
              disabled={uploading}
              onChange={(e) => {
                void upload(e.target.files?.[0])
                e.target.value = ''
              }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {notice && <p style={{ margin: '8px 0 0', fontSize: 14 }}>{notice}</p>}
      </div>

      {error && <p style={errorTextStyle}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
        <span style={{ fontSize: 14 }}>חודש</span>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} style={{ ...fieldInputStyle, minHeight: 40, fontSize: 14, width: 'auto' }} />
      </div>

      {check && (
        <div style={{ ...cardStyle, marginBottom: 10 }}>
          {check.isClosed ? (
            <div style={{ fontWeight: 600 }}>החודש סגור</div>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>
                {check.canClose ? 'הכל טופל, אפשר לסגור את החודש' : `${check.pendingCount + check.settlementsWithoutCardStatement.length} פריטים מחכים להחלטה`}
              </div>
              {check.settlementsWithoutCardStatement.length > 0 && (
                <p style={{ ...mutedTextStyle, margin: '4px 0 0', color: 'var(--warning)' }}>
                  חיוב אשראי בבנק בלי דף אשראי תואם: {check.settlementsWithoutCardStatement.map((s) => formatMoney(s.amount)).join(', ')}. כדאי להעלות את דף האשראי של החודש.
                </p>
              )}
            </>
          )}
          <button
            type="button"
            disabled={!check.isClosed && !check.canClose}
            onClick={() => void toggleClose()}
            style={{ ...(check.isClosed ? secondaryButtonStyle : primaryButtonStyle), minHeight: 40, fontSize: 14, marginTop: 8, opacity: !check.isClosed && !check.canClose ? 0.5 : 1 }}
          >
            {check.isClosed ? 'פתיחה מחדש' : 'סגירת החודש'}
          </button>
        </div>
      )}

      {lines.length > 0 && !locked && (
        <button type="button" onClick={() => void clearOpen()} style={{ ...linkButtonStyle, color: 'var(--danger)', marginBottom: 8 }}>
          ניקוי שורות החודש כדי להעלות את הקובץ מחדש
        </button>
      )}

      <FilterTabs<Tab>
        ariaLabel="סינון שורות"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'todo', label: 'ממתינות', count: todo.length },
          { value: 'done', label: 'טופלו', count: done.length },
          { value: 'ignored', label: 'לא הוצאה', count: ignored.length },
        ]}
      />

      <div style={{ marginTop: 8 }}>
        {shown.length === 0 && <p style={mutedTextStyle}>{lines.length === 0 ? 'אין שורות בחודש הזה. אפשר להעלות דף.' : 'אין שורות כאן.'}</p>}
        {shown.map((line) => (
          <LineCard
            key={line.id}
            line={line}
            types={types}
            groups={groups}
            locked={locked}
            onMatch={(expenseId) => decide(() => api.matchLine(line.id, expenseId))()}
            onCreate={(body) => decide(() => api.createExpenseFromLine(line.id, body))()}
            onIgnore={decide(() => api.ignoreLine(line.id))}
            onSettlement={decide(() => api.markSettlement(line.id))}
            onReset={decide(() => api.resetLine(line.id))}
            onDeleteExpense={decide(() => api.deleteExpense(line.expenseId ?? ''))}
          />
        ))}
      </div>

      {check && check.expensesNotInStatements.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setShowMissing((v) => !v)} style={linkButtonStyle}>
            {showMissing ? 'הסתרה' : `הוצאות שהוזנו ולא מופיעות בדפים (${check.expensesNotInStatements.length})`}
          </button>
          {showMissing && (
            <>
              <p style={mutedTextStyle}>תקין אם שולם במזומן או שיופיע בדף הבא. אם זו הוצאה שהוזנה פעמיים, כדאי למחוק אחת.</p>
              {check.expensesNotInStatements.map((e) => (
                <div key={e.id} style={{ ...cardStyle, marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                  <span>
                    {e.description} · {formatOrderDate(e.date)}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>{formatMoney(e.amount)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 16, margin: '20px 0 6px' }}>קבצים שהועלו</h2>
      {files.length === 0 && <p style={mutedTextStyle}>עוד לא הועלו קבצים.</p>}
      {files.map((f) => (
        <div key={f.id} style={{ ...cardStyle, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ minWidth: 0, fontSize: 14 }}>
            <div style={{ overflowWrap: 'anywhere' }} dir="ltr">{f.fileName}</div>
            <div style={mutedTextStyle}>
              {f.source === 'BANK' ? 'בנק' : 'אשראי'} · {f.lineCount} שורות
              {f.periodFrom && f.periodTo ? ` · ${formatOrderDate(f.periodFrom)}–${formatOrderDate(f.periodTo)}` : ''}
            </div>
          </div>
          <button type="button" onClick={() => void removeFile(f)} style={linkButtonStyle}>
            מחיקה
          </button>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={() => void (keywords === null ? openKeywords() : setKeywords(null))} style={linkButtonStyle}>
          {keywords === null ? 'מילים שמזהות חיוב כרטיס אשראי בבנק' : 'סגירה'}
        </button>
        {keywords !== null && (
          <div style={{ ...cardStyle, marginTop: 6 }}>
            <p style={{ ...mutedTextStyle, margin: '0 0 6px' }}>שורה בדף הבנק שמכילה אחת מהמילים נחשבת חיוב כרטיס ולא הוצאה. מופרדות בפסיק.</p>
            <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} style={{ ...fieldInputStyle, fontSize: 14 }} />
            <button type="button" onClick={() => void saveKeywords()} style={{ ...primaryButtonStyle, minHeight: 40, fontSize: 14, marginTop: 8 }}>
              שמירה
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { errorTextStyle } from '../products/productStyles'
import { InvoicePreview } from './InvoicePreview'
import { openInvoice, removeInvoice } from './invoiceApi'

type InvoiceSectionProps = {
  // Null while the expense is not saved yet; the picked file is then sent after saving.
  expenseId: string | null
  hasFile: boolean
  pendingFile: File | null
  // Called with the picked file (or null to drop it).
  onPick: (file: File | null) => void
  // Called after the stored file was removed from the server.
  onRemoved: () => void
  // The empty state as a big dashed button instead of a small link.
  prominent?: boolean
  // The empty state as one slim row (the top of the expense form).
  slim?: boolean
  // A line under the picked file, e.g. what the reader is doing.
  note?: string | null
  // True while the reader works on the picked file: shows the waiting card.
  reading?: boolean
  // Replaces the default text of the big button.
  title?: string
  subtitle?: string
}

// Everything about one expense's invoice: a place to add one when needed, then view, replace, remove.
export function InvoiceSection({ expenseId, hasFile, pendingFile, onPick, onRemoved, prominent, slim, note, reading, title, subtitle }: InvoiceSectionProps) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const stored = hasFile && !pendingFile

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          e.target.value = ''
          if (file) onPick(file)
        }}
      />

      {pendingFile && (
        <div style={rowStyle}>
          <InvoicePreview file={pendingFile} />
          <span style={nameStyle}>חשבונית: {pendingFile.name}</span>
          <button type="button" onClick={() => onPick(null)} style={linkStyle}>
            הסרה
          </button>
        </div>
      )}

      {pendingFile && reading && (
        <div className="invoice-reading" role="status" aria-live="polite" style={readingStyle}>
          <span className="invoice-reading-spinner" aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>קורא את החשבונית...</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>הפרטים ימולאו לבד בעוד כמה שניות</div>
            <div className="invoice-reading-bar" aria-hidden="true" />
          </div>
        </div>
      )}

      {pendingFile && !reading && note && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{note}</p>}

      {stored && (
        <div style={rowStyle}>
          <span style={{ ...nameStyle, color: 'var(--success)' }}>חשבונית מצורפת</span>
          {expenseId && (
            <button type="button" disabled={busy} onClick={() => void run(() => openInvoice(expenseId))} style={linkStyle}>
              צפייה
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => input.current?.click()} style={linkStyle}>
            החלפה
          </button>
          {expenseId && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await removeInvoice(expenseId)
                  onRemoved()
                })
              }
              style={{ ...linkStyle, color: 'var(--danger)' }}
            >
              הסרה
            </button>
          )}
        </div>
      )}

      {!pendingFile && !stored && (
        <button type="button" onClick={() => input.current?.click()} style={slim ? slimStyle : prominent ? attachStyle : addLinkStyle}>
          {slim ? (
            <>
              <PaperclipIcon />
              <span>{title ?? 'הוספת חשבונית'}</span>
              <small style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{subtitle ?? 'תמונה או PDF'}</small>
            </>
          ) : prominent ? (
            <>
              <span style={{ display: 'block' }}>{title ?? 'צילום או צירוף חשבונית'}</span>
              {subtitle && <span style={{ display: 'block', fontSize: 12, fontWeight: 400, marginTop: 2 }}>{subtitle}</span>}
            </>
          ) : (
            '+ חשבונית'
          )}
        </button>
      )}

      {error && <p style={{ ...errorTextStyle, margin: '6px 0 0' }}>{error}</p>}
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l9-9a3.7 3.7 0 015.2 5.2l-9 9a1.8 1.8 0 01-2.6-2.6l8.4-8.4" />
    </svg>
  )
}

const slimStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  minHeight: 42,
  padding: '0 12px',
  border: '1px dashed var(--accent)',
  borderRadius: 10,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '6px 12px',
  borderRadius: 8,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
}

const readingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 8,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'var(--accent-bg)',
  border: '1px solid var(--accent)',
  color: 'var(--text)',
}

const nameStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 14,
}

const linkStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 14,
  padding: '6px 0',
  cursor: 'pointer',
}

const addLinkStyle: React.CSSProperties = {
  ...linkStyle,
  padding: '8px 0',
}

const attachStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 64,
  padding: '8px 12px',
  border: '1px dashed var(--accent)',
  borderRadius: 8,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

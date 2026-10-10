import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type InvoicePreviewProps = {
  file: File
}

// A look at the invoice that was just picked, so its details can be compared with what the form says.
// Images open full screen (tap to zoom); a PDF or an image the browser cannot draw opens in a new tab.
export function InvoicePreview({ file }: InvoicePreviewProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [undrawable, setUndrawable] = useState(false)
  const isImage = file.type.startsWith('image/') && !undrawable

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!url) return null

  function show() {
    if (isImage) {
      setZoomed(false)
      setOpen(true)
    } else {
      window.open(url!, '_blank')
    }
  }

  return (
    <>
      <button type="button" onClick={show} aria-label="צפייה בחשבונית" style={thumbStyle}>
        {isImage ? (
          <img src={url} alt="" onError={() => setUndrawable(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600 }}>{file.type === 'application/pdf' ? 'PDF' : 'צפייה'}</span>
        )}
      </button>

      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="החשבונית שהועלתה" onClick={() => setOpen(false)} style={overlayStyle}>
            <button type="button" aria-label="סגירה" onClick={() => setOpen(false)} style={closeStyle}>
              ✕
            </button>
            <div onClick={(e) => e.stopPropagation()} style={scrollStyle}>
              <img
                src={url}
                alt="החשבונית שהועלתה"
                onClick={() => setZoomed((z) => !z)}
                style={zoomed ? zoomedImageStyle : fitImageStyle}
              />
            </div>
            <p style={hintStyle}>{zoomed ? 'הקשה על התמונה מקטינה אותה' : 'הקשה על התמונה מגדילה אותה'}</p>
          </div>,
          document.body,
        )}
    </>
  )
}

const thumbStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  overflow: 'hidden',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  cursor: 'pointer',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: 16,
  background: 'rgba(0, 0, 0, 0.88)',
}

const closeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  insetInlineEnd: 12,
  width: 44,
  height: 44,
  border: 'none',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.18)',
  color: '#fff',
  fontSize: 20,
  cursor: 'pointer',
}

const scrollStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: 'calc(100% - 56px)',
  overflow: 'auto',
}

const fitImageStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  maxHeight: 'calc(100vh - 120px)',
  objectFit: 'contain',
  cursor: 'zoom-in',
}

const zoomedImageStyle: React.CSSProperties = {
  display: 'block',
  width: '220%',
  maxWidth: 'none',
  cursor: 'zoom-out',
}

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'rgba(255, 255, 255, 0.75)',
}

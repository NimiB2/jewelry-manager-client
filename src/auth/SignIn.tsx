import { useState } from 'react'

type SignInProps = {
  onSignIn: () => Promise<unknown>
}

// Browsers built into chat apps block the storage that Google sign-in needs, so it cannot work there.
const IN_APP_BROWSER = /WhatsApp|FBAN|FBAV|Instagram|Line\/|Telegram|Messenger/i

function friendlyError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return ''
  if (code === 'auth/popup-blocked') return 'הדפדפן חסם את חלון ההתחברות. יש לאשר חלונות קופצים לאתר ולנסות שוב.'
  if (code === 'auth/unauthorized-domain') return 'הכתובת הזו לא מורשית להתחברות. יש לפנות למנהל המערכת.'
  return 'ההתחברות נכשלה. אפשר לנסות שוב, או לפתוח את הקישור בדפדפן רגיל (Chrome או Safari).'
}

export function SignIn({ onSignIn }: SignInProps) {
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const inApp = IN_APP_BROWSER.test(navigator.userAgent)

  async function signIn() {
    setError('')
    try {
      await onSignIn()
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '4rem 24px 0', textAlign: 'center' }}>
      {inApp && (
        <div role="alert" style={{ maxWidth: 420, padding: 14, borderRadius: 10, background: '#fff7e0', border: '1px solid #e8c964', fontSize: 15 }}>
          <strong>הקישור נפתח בתוך אפליקציה (למשל וואטסאפ).</strong>
          <p style={{ margin: '8px 0 12px' }}>ההתחברות עם Google לא עובדת כאן. יש לפתוח את הקישור בדפדפן רגיל: Chrome או Safari.</p>
          <button type="button" onClick={() => void copyLink()}>
            {copied ? 'הקישור הועתק' : 'העתקת הקישור'}
          </button>
        </div>
      )}

      <button type="button" onClick={() => void signIn()}>
        התחבר עם Google
      </button>

      {error && (
        <p role="alert" style={{ margin: 0, maxWidth: 420, color: '#c0392b', fontSize: 14 }}>
          {error}
        </p>
      )}
    </div>
  )
}

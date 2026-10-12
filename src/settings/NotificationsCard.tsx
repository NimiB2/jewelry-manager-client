import { useState } from 'react'
import { statusTextStyle } from './formStyles'
import { Section } from './Section'

type Availability = 'unsupported' | 'needs-install' | 'ready'

// iOS only exposes push inside the app installed to the home screen, so a plain browser tab
// has no PushManager. Telling the two apart lets us explain what to do instead of failing silently.
function getAvailability(): Availability {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return 'needs-install'
  }
  if (!('PushManager' in window)) return 'unsupported'
  return 'ready'
}

// Step 1 only asks the device for permission. Subscribing to push needs the server's public key
// and is added together with the server in step 2.
export function NotificationsCard() {
  const availability = getAvailability()
  const [permission, setPermission] = useState<NotificationPermission | null>(
    availability === 'ready' ? Notification.permission : null,
  )

  async function enable() {
    setPermission(await Notification.requestPermission())
  }

  return (
    <Section title="התראות על הזמנות חדשות">
      {availability !== 'ready' && (
        <p style={{ ...statusTextStyle, marginTop: 0 }}>
          כדי לקבל התראות צריך להוסיף את האפליקציה למסך הבית דרך Safari (שיתוף ← הוסף למסך הבית), ולפתוח אותה מהאייקון.
        </p>
      )}
      {availability === 'ready' && permission === 'default' && (
        <button type="button" onClick={enable} style={buttonStyle}>
          הפעל התראות
        </button>
      )}
      {availability === 'ready' && permission === 'granted' && (
        <p style={{ ...statusTextStyle, marginTop: 0, color: 'var(--text)' }}>✓ מופעל במכשיר הזה</p>
      )}
      {availability === 'ready' && permission === 'denied' && (
        <p style={{ ...statusTextStyle, marginTop: 0, color: 'var(--danger)' }}>
          ההתראות חסומות. אפשר לאפשר אותן בהגדרות הטלפון, תחת ההתראות של האפליקציה.
        </p>
      )}
    </Section>
  )
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  fontSize: 15,
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
}

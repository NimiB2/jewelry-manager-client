import { SignIn } from './auth/SignIn'
import { useAuth } from './auth/useAuth'
import { SettingsPage } from './settings/SettingsPage'
import './App.css'

function App() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth()

  if (loading) return null
  if (!user) return <SignIn onSignIn={signInWithGoogle} />

  return (
    <>
      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
        מחוברת כ-{user.email}{' '}
        <button type="button" onClick={signOutUser}>
          התנתק
        </button>
      </div>
      <SettingsPage />
    </>
  )
}

export default App

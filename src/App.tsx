import { SignIn } from './auth/SignIn'
import { useAuth } from './auth/useAuth'
import { ComingSoonPage } from './shell/ComingSoonPage'
import { AppShell } from './shell/AppShell'
import { useRoute } from './shell/useRoute'
import { ProductCalculator } from './products/ProductCalculator'
import { ProductsPage } from './products/ProductsPage'
import { SettingsPage } from './settings/SettingsPage'
import './App.css'

function App() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth()
  const route = useRoute()

  if (loading) return null
  if (!user) return <SignIn onSignIn={signInWithGoogle} />

  return (
    <AppShell route={route} userEmail={user.email} onSignOut={signOutUser}>
      {route.page === 'products' && <ProductsPage />}
      {route.page === 'product-form' && <ProductCalculator key={route.productId ?? 'new'} productId={route.productId} />}
      {route.page === 'settings' && <SettingsPage />}
      {route.page === 'orders' && <ComingSoonPage title="הזמנות" />}
      {route.page === 'finances' && <ComingSoonPage title="כספים" />}
    </AppShell>
  )
}

export default App

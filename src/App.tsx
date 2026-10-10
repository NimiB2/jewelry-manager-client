import { SignIn } from './auth/SignIn'
import { useAuth } from './auth/useAuth'
import { FinancesPage } from './finances/FinancesPage'
import { HomePage } from './home/HomePage'
import { InvoicesPage } from './finances/InvoicesPage'
import { AppShell } from './shell/AppShell'
import { useRoute } from './shell/useRoute'
import { OrderForm } from './orders/OrderForm'
import { OrdersPage } from './orders/OrdersPage'
import { ProductCalculator } from './products/ProductCalculator'
import { ProductsPage } from './products/ProductsPage'
import { SettingsPage } from './settings/SettingsPage'
import { ShopifyImportPage } from './shopify/ShopifyImportPage'
import { TasksPage } from './tasks/TasksPage'
import './App.css'

function App() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth()
  const route = useRoute()

  if (loading) return null
  if (!user) return <SignIn onSignIn={signInWithGoogle} />

  return (
    <AppShell route={route} userEmail={user.email} onSignOut={signOutUser}>
      {route.page === 'home' && <HomePage userEmail={user.email} onSignOut={signOutUser} />}
      {route.page === 'products' && <ProductsPage key={route.collection ?? 'all'} collectionName={route.collection} />}
      {route.page === 'product-form' && (
        <ProductCalculator
          key={route.productId ?? 'new'}
          productId={route.productId}
          custom={route.custom}
          returnTo={route.returnTo}
        />
      )}
      {route.page === 'settings' && <SettingsPage />}
      {route.page === 'orders' && <OrdersPage />}
      {route.page === 'order-form' && (
        <OrderForm
          key={route.orderId ?? 'new'}
          orderId={route.orderId}
          addProductId={route.addProductId}
          restoreDraft={route.restoreDraft}
        />
      )}
      {route.page === 'finances' && (route.view === 'invoices' ? <InvoicesPage /> : <FinancesPage />)}
      {route.page === 'tasks' && <TasksPage />}
      {route.page === 'shopify' && <ShopifyImportPage />}
    </AppShell>
  )
}

export default App

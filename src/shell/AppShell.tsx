import type { ReactNode } from 'react'
import { FinancesIcon, OrdersIcon, ProductsIcon, SettingsIcon, TasksIcon } from '../icons/NavIcons'
import type { Route } from './useRoute'
import './shell.css'

type AppShellProps = {
  route: Route
  userEmail: string | null
  onSignOut: () => void
  children: ReactNode
}

// Top to bottom in the sidebar (right to left in the phone tab bar): Settings sits at the bottom.
const tabs = [
  { page: 'finances', href: '#/finances', label: 'כספים', icon: <FinancesIcon /> },
  { page: 'orders', href: '#/orders', label: 'הזמנות', icon: <OrdersIcon /> },
  { page: 'products', href: '#/products', label: 'מוצרים', icon: <ProductsIcon /> },
  { page: 'tasks', href: '#/tasks', label: 'משימות', icon: <TasksIcon /> },
  { page: 'settings', href: '#/settings', label: 'הגדרות', icon: <SettingsIcon /> },
] as const

// Bottom tab bar on a phone, sidebar on a wide screen. The product calculator is a separate
// full screen (it has its own sticky price bar), so the navigation is hidden there.
export function AppShell({ route, userEmail, onSignOut, children }: AppShellProps) {
  const fullScreen = route.page === 'product-form' || route.page === 'order-form'
  const activePage =
    route.page === 'product-form' ? (route.custom ? 'orders' : 'products') : route.page === 'order-form' ? 'orders' : route.page

  return (
    <>
      <div className={fullScreen ? 'app-main app-main-full' : 'app-main'}>
        {!fullScreen && (
          <div className="app-topbar">
            <span>מחוברת כ-{userEmail}</span>
            <button type="button" onClick={onSignOut}>
              התנתקי
            </button>
          </div>
        )}
        {children}
      </div>

      {!fullScreen && (
        <nav className="app-nav" aria-label="ניווט ראשי">
          {tabs.map((tab) => (
            <a key={tab.page} href={tab.href} aria-current={activePage === tab.page ? 'page' : undefined}>
              {tab.icon}
              <span>{tab.label}</span>
            </a>
          ))}
        </nav>
      )}
    </>
  )
}

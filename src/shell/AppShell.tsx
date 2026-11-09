import type { ReactNode } from 'react'
import { FinancesIcon, OrdersIcon, ProductsIcon, SettingsIcon, TasksIcon } from '../icons/NavIcons'
import { useOrdersAttention } from '../orders/attention'
import { subItemsOf } from './navItems'
import type { Route } from './useRoute'
import './shell.css'

type AppShellProps = {
  route: Route
  userEmail: string | null
  onSignOut: () => void
  children: ReactNode
}

// Top to bottom in the sidebar (right to left in the phone tab bar): Settings sits at the bottom.
// Home has no tab: the app name (top bar on a phone, top of the sidebar) leads to it.
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
  // The red number on "Orders": store orders waiting for approval, and orders the store changed.
  const attention = useOrdersAttention(route.page)
  const fullScreen = route.page === 'product-form' || route.page === 'order-form'
  const activePage =
    route.page === 'product-form'
      ? route.custom ? 'orders' : 'products'
      : route.page === 'order-form' ? 'orders' : route.page === 'shopify' ? 'products' : route.page === 'search' ? 'home' : route.page

  return (
    <>
      <div className={fullScreen ? 'app-main app-main-full' : 'app-main'}>
        {!fullScreen && (
          <header className="app-topbar">
            <a href="#/home" aria-current={activePage === 'home' ? 'page' : undefined}>
              ניהול תכשיטים
            </a>
          </header>
        )}
        {children}
      </div>

      {!fullScreen && (
        <nav className="app-nav" aria-label="ניווט ראשי">
          <a className="app-brand" href="#/home" aria-current={activePage === 'home' ? 'page' : undefined}>
            ניהול תכשיטים
          </a>
          {tabs.map((tab) => (
            <div key={tab.page} className="app-nav-group">
              <a href={tab.href} aria-current={activePage === tab.page ? 'page' : undefined}>
                {tab.icon}
                <span>{tab.label}</span>
                {tab.page === 'orders' && attention !== null && attention.total > 0 && (
                  <span className="app-badge" role="status" aria-label={`${attention.total} הזמנות מחכות לתשומת לב`}>
                    {attention.total}
                  </span>
                )}
              </a>
              {(tab.page === 'finances' || tab.page === 'products') && (
                <div className="app-sub" role="group" aria-label={`תתי-אפשרויות של ${tab.label}`}>
                  {subItemsOf(tab.page, route).map((item) => (
                    <a key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* On a phone the account lives on the home screen; the sidebar shows it at the bottom. */}
          <div className="app-user">
            <span title={userEmail ?? undefined}>{userEmail}</span>
            <button type="button" onClick={onSignOut}>
              התנתקות
            </button>
          </div>
        </nav>
      )}
    </>
  )
}

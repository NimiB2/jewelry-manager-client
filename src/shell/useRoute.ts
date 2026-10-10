import { useEffect, useState } from 'react'

export type Route =
  | { page: 'home' }
  | { page: 'orders' }
  // addProductId: a product just created through "custom item", to be added to the order.
  | { page: 'order-form'; orderId: string | null; addProductId: string | null; restoreDraft: boolean }
  // collection: show only the products of the collection with this name.
  | { page: 'products'; collection: string | null }
  // custom + returnTo: the calculator was opened from an order to make a one-off item.
  | { page: 'product-form'; productId: string | null; custom: boolean; returnTo: string | null }
  // view: the movements list, or the invoices view (expenses and whether each has an invoice).
  | { page: 'finances'; view: 'all' | 'invoices' }
  | { page: 'tasks' }
  // Bring the online store's products next to the catalog and tie them together.
  | { page: 'shopify' }
  | { page: 'settings' }

// The route lives in the URL hash (#/products/new?custom=1), so refresh and the browser's back button keep working.
function parse(hash: string): Route {
  const [path, queryString = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const query = new URLSearchParams(queryString)

  switch (parts[0]) {
    case 'home':
      return { page: 'home' }
    case 'orders':
      if (parts[1]) {
        return {
          page: 'order-form',
          orderId: parts[1] === 'new' ? null : parts[1],
          addProductId: query.get('addProduct'),
          restoreDraft: query.get('restore') === '1',
        }
      }
      return { page: 'orders' }
    case 'finances':
      return { page: 'finances', view: parts[1] === 'invoices' ? 'invoices' : 'all' }
    case 'tasks':
      return { page: 'tasks' }
    case 'shopify':
      return { page: 'shopify' }
    case 'settings':
      return { page: 'settings' }
    case 'products':
      if (parts[1]) {
        return {
          page: 'product-form',
          productId: parts[1] === 'new' ? null : parts[1],
          custom: query.get('custom') === '1',
          returnTo: query.get('returnTo'),
        }
      }
      return { page: 'products', collection: query.get('collection') }
    default:
      return { page: 'home' }
  }
}

export function navigate(path: string) {
  window.location.hash = path
}

// Swaps the current URL instead of adding a history entry (used to drop one-time query values).
export function replaceRoute(path: string) {
  window.history.replaceState(null, '', `#${path}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

import { useEffect, useState } from 'react'

export type Route =
  | { page: 'orders' }
  | { page: 'products' }
  | { page: 'product-form'; productId: string | null }
  | { page: 'finances' }
  | { page: 'tasks' }
  | { page: 'settings' }

// The route lives in the URL hash (#/products/new), so refresh and the browser's back button keep working.
function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (parts[0]) {
    case 'orders':
      return { page: 'orders' }
    case 'finances':
      return { page: 'finances' }
    case 'tasks':
      return { page: 'tasks' }
    case 'settings':
      return { page: 'settings' }
    case 'products':
      if (parts[1] === 'new') return { page: 'product-form', productId: null }
      if (parts[1]) return { page: 'product-form', productId: parts[1] }
      return { page: 'products' }
    default:
      // The spec opens on Orders; until that screen exists, Products is the landing page.
      return { page: 'products' }
  }
}

export function navigate(path: string) {
  window.location.hash = path
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

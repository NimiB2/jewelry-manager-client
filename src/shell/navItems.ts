import type { Route } from './useRoute'

export type SubItem = { label: string; href: string; active: boolean }

// The collections the "rings" shortcuts point at; they are matched by name.
export const WEDDING_RINGS = 'טבעות נישואין'
export const ENGAGEMENT_RINGS = 'טבעות אירוסין'

const collectionHref = (name: string) => `#/products?collection=${encodeURIComponent(name)}`

// The sub-options under a main menu item. Only Finances and Products have any; they are always listed,
// and the one matching the current screen is marked.
export function subItemsOf(parent: 'finances' | 'products', route: Route): SubItem[] {
  if (parent === 'finances') {
    const view = route.page === 'finances' ? route.view : null
    return [
      { label: 'תנועות', href: '#/finances', active: view === 'all' },
      { label: 'חשבוניות', href: '#/finances/invoices', active: view === 'invoices' },
    ]
  }

  const collection = route.page === 'products' ? route.collection : undefined
  const onProducts = route.page === 'products'
  return [
    { label: 'כל המוצרים', href: '#/products', active: onProducts && collection === null },
    { label: WEDDING_RINGS, href: collectionHref(WEDDING_RINGS), active: collection === WEDDING_RINGS },
    { label: ENGAGEMENT_RINGS, href: collectionHref(ENGAGEMENT_RINGS), active: collection === ENGAGEMENT_RINGS },
  ]
}

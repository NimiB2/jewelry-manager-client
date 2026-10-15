// The group an expense belongs to by default, decided from its category name. It is only a starting
// choice: she can change the group on every expense.

// Costs of making an order (materials, stones, setting, plating).
const ORDER_WORDS = ['חומר', 'זהב', 'כסף', 'חוט', 'פנינ', 'יהלומ', 'אבנ', 'שיבוץ', 'ציפוי']

// Costs of running the business.
const BUSINESS_WORDS = ['אריז', 'שיווק', 'משלוח', 'רכב', 'עמלה', 'עמלות', 'מערכת', 'מערכות']

const STORAGE_KEY = 'expense-category-groups'

// Her own choices from the grouping screen, per category. They are kept on this device and win over the words.
export function loadCategoryGroups(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function saveCategoryGroups(map: Record<string, string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Without storage the words still decide.
  }
}

// Returns the name of one of her groups, or '' when the category matches no rule or the group is missing.
export function defaultGroupFor(typeName: string, groups: string[]): string {
  const name = typeName.trim()
  if (!name) return ''

  const chosen = loadCategoryGroups()[name]
  if (chosen && groups.includes(chosen)) return chosen

  if (ORDER_WORDS.some((w) => name.includes(w))) return groups.find((g) => g.includes('הזמנות')) ?? ''
  if (BUSINESS_WORDS.some((w) => name.includes(w))) return groups.find((g) => g.includes('עסק')) ?? ''
  return ''
}

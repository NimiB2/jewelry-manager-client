// The group an expense belongs to by default, decided from its category name. It is only a starting
// choice: the grouping screen can change whole categories at once.

// Costs of making an order (materials, stones, setting, plating, casting).
const ORDER_WORDS = ['חומר', 'זהב', 'כסף', 'חוט', 'פנינ', 'יהלומ', 'אבנ', 'שיבוץ', 'ציפוי', 'יציקה']

// Costs of running the business.
const BUSINESS_WORDS = ['אריז', 'שיווק', 'קידום', 'משלוח', 'עמלה', 'עמלות', 'מערכת', 'מערכות']

// Household costs, and the car.
const HOME_WORDS = ['חשמל', 'ארנונה', 'ועד בית', 'רכב']

// Matched as a whole word, because "מים" is also the end of "יהלומים".
const HOME_EXACT_WORDS = ['מים']

const OTHER_WORDS = ['תרומה']

// Materials and stones bought to make new pieces for the business, not for a particular order.
export const STOCK_GROUP = 'הוצאות מלאי'

const STORAGE_KEY = 'expense-category-groups-v2'

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

// The orders group of her list, by name.
export function ordersGroupOf(groups: string[]): string {
  return groups.find((g) => g.includes('הזמנות')) ?? ''
}

// Returns the name of one of her groups, or '' when the category matches no rule or the group is missing.
// `typeGroups` is the category-to-group choice saved in her settings; it wins over everything else.
export function defaultGroupFor(typeName: string, groups: string[], typeGroups: Record<string, string> = {}): string {
  const name = typeName.trim()
  if (!name) return ''

  const saved = typeGroups[name]
  if (saved && groups.includes(saved)) return saved

  const chosen = loadCategoryGroups()[name]
  if (chosen && groups.includes(chosen)) return chosen

  const words = name.split(/[\s/()]+/)
  const has = (list: string[]) => list.some((w) => name.includes(w))

  if (has(ORDER_WORDS)) return ordersGroupOf(groups)
  if (has(BUSINESS_WORDS)) return groups.find((g) => g.includes('עסק')) ?? ''
  if (has(HOME_WORDS) || HOME_EXACT_WORDS.some((w) => words.includes(w))) return groups.find((g) => g.includes('בית')) ?? ''
  if (has(OTHER_WORDS)) return groups.find((g) => g.includes('אחר')) ?? ''
  return ''
}

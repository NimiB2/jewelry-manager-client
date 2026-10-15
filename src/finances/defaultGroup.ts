// The group an expense belongs to by default, decided from its category name. It is only a starting
// choice: she can change the group on every expense.

// Costs of making an order (materials, stones, setting, plating).
const ORDER_WORDS = ['חומר', 'יהלומ', 'אבנ', 'שיבוץ', 'ציפוי']

// Costs of running the business.
const BUSINESS_WORDS = ['אריז', 'שיווק', 'משלוח', 'רכב', 'עמלה', 'עמלות', 'מערכת', 'מערכות']

// Returns the name of one of her groups, or '' when the category matches no rule or the group is missing.
export function defaultGroupFor(typeName: string, groups: string[]): string {
  const name = typeName.trim()
  if (!name) return ''

  if (ORDER_WORDS.some((w) => name.includes(w))) return groups.find((g) => g.includes('הזמנות')) ?? ''
  if (BUSINESS_WORDS.some((w) => name.includes(w))) return groups.find((g) => g.includes('עסק')) ?? ''
  return ''
}

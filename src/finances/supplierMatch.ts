// Suppliers are typed (or read from an invoice) in many spellings: "X Ltd", "X", "x בע״מ". These helpers
// treat spellings that differ only in case, spacing, punctuation or a company suffix as the same supplier.

const COMPANY_SUFFIXES = new Set(['בע"מ', 'בע״מ', "בע'מ", 'בעמ', 'ltd', 'inc', 'llc'])

export function supplierKey(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !COMPANY_SUFFIXES.has(w.replace(/^[.,]+|[.,]+$/g, '')))
    .join('')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

// The expense category a supplier is usually recorded under; '' when the supplier is new or unknown.
export function typeForSupplier(supplierTypes: Record<string, string>, supplier: string): string {
  const key = supplierKey(supplier)
  if (!key) return ''
  for (const [name, type] of Object.entries(supplierTypes)) {
    if (supplierKey(name) === key) return type
  }
  return ''
}

// Groups of listed suppliers that look like one supplier written differently.
export function similarSupplierGroups(names: string[]): string[][] {
  const keyed = names.map((name) => ({ name, key: supplierKey(name) })).filter((s) => s.key.length >= 3)
  const parent = keyed.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))

  for (let i = 0; i < keyed.length; i++) {
    for (let j = i + 1; j < keyed.length; j++) {
      const a = keyed[i].key
      const b = keyed[j].key
      if (a === b || a.startsWith(b) || b.startsWith(a)) parent[find(i)] = find(j)
    }
  }

  const groups = new Map<number, string[]>()
  keyed.forEach((s, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), s.name]))
  return [...groups.values()].filter((g) => g.length > 1)
}

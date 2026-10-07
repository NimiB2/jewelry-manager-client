import type { Addition } from './types'

export type AdditionType = { name: string; allowsCustomName: boolean }

// One line of the additions list. Every addition type is shown up front; a line counts only once
// it has a price. `unknownType` marks a saved addition whose type was since removed from settings.
export type AdditionRow = {
  key: string
  typeName: string
  customName: string
  price: string
  quantity: string
  unknownType?: boolean
}

let counter = 0
export function newRow(typeName: string): AdditionRow {
  return { key: `row-${++counter}`, typeName, customName: '', price: '', quantity: '1' }
}

export function rowsFromProduct(types: AdditionType[], additions: Addition[]): AdditionRow[] {
  const rows: AdditionRow[] = []

  for (const type of types) {
    const saved = additions.filter((a) => a.typeName === type.name)
    if (saved.length === 0) rows.push(newRow(type.name))
    for (const a of saved) {
      rows.push({
        ...newRow(type.name),
        customName: a.customName ?? '',
        price: String(a.price),
        quantity: String(a.quantity),
      })
    }
  }

  for (const a of additions.filter((a) => !types.some((t) => t.name === a.typeName))) {
    rows.push({
      ...newRow(a.typeName),
      customName: a.customName ?? '',
      price: String(a.price),
      quantity: String(a.quantity),
      unknownType: true,
    })
  }

  return rows
}

// The rows that are actually part of the product: those with a price.
export function rowsToAdditions(rows: AdditionRow[]): Addition[] {
  return rows
    .filter((r) => Number(r.price) > 0)
    .map((r) => ({
      typeName: r.typeName,
      customName: r.customName.trim() || null,
      price: Number(r.price),
      quantity: Math.max(1, Math.floor(Number(r.quantity) || 1)),
    }))
}

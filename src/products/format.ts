const money = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 })

export function formatMoney(value: number): string {
  // The minus goes before the number (-₪1,500), not after it.
  return value < 0 ? `-₪${money.format(-value)}` : `₪${money.format(value)}`
}

export function formatPercent(rate: number): string {
  return `${money.format(Math.round(rate * 1000) / 10)}%`
}

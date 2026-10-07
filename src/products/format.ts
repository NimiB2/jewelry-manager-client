const money = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 })

export function formatMoney(value: number): string {
  return `₪${money.format(value)}`
}

export function formatPercent(rate: number): string {
  return `${money.format(Math.round(rate * 1000) / 10)}%`
}

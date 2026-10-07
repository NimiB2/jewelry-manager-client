const monthNames = new Intl.DateTimeFormat('he-IL', { month: 'long' })
const shortDate = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function monthName(month: number): string {
  return monthNames.format(new Date(2000, month - 1, 1))
}

// "2026-10-03" -> "03.10.2026"
export function formatOrderDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return shortDate.format(new Date(y, m - 1, d)).replaceAll('/', '.')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// First and last day of a month or of a whole year, as yyyy-MM-dd (inclusive range for the API).
export function periodRange(year: number | null, month: number | null): { from: string; to: string } | null {
  if (year === null) return null
  if (month === null) return { from: `${year}-01-01`, to: `${year}-12-31` }
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` }
}

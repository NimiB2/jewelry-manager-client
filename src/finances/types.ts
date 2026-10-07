export type FinanceKind = 'INCOME' | 'EXPENSE'

export type ExpenseCategory = 'FIXED' | 'VARIABLE'

export type IncomeCategory = 'SALES' | 'OTHER'

export type FinanceItem = {
  kind: FinanceKind
  id: string
  date: string
  description: string
  amount: number
  expenseCategory: ExpenseCategory | null
  incomeCategory: IncomeCategory | null
  // Income that came from an order: read-only here, edited through the order.
  orderId: string | null
  hasReceipt: boolean
  seriesId: string | null
  repeatEveryMonths: number | null
}

export type FinanceSummary = {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  expensesWithoutReceipt: number
}

export type FinanceList = {
  items: FinanceItem[]
  summary: FinanceSummary
}

export type TypeFilter = 'all' | 'income' | 'expense'
export type ReceiptFilter = 'all' | 'missing' | 'has'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FIXED: 'קבועה',
  VARIABLE: 'משתנה',
}

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  SALES: 'מכירות',
  OTHER: 'אחר',
}

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
  // Income: the order it came from (read-only). Expense: the order it was made for (optional link).
  orderId: string | null
  hasReceipt: boolean
  seriesId: string | null
  repeatEveryMonths: number | null
  typeName: string | null
  // The number of the linked order, for display.
  orderNumber: number | null
  hasInvoiceFile: boolean
  supplier: string | null
  notes: string | null
  // A coming occurrence of a recurring expense: not real yet, not in the totals. Its id is the latest real one of the series.
  isProjected: boolean
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

// A fixed expense is the same amount again every month (a recurring series); a variable one is a single payment.
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FIXED: 'קבועה',
  VARIABLE: 'חד פעמית',
}

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  SALES: 'מכירות',
  OTHER: 'אחר',
}

export type OrderOption = { id: string; label: string }

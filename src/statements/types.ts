export type LineStatus = 'PENDING' | 'MATCHED' | 'CREATED' | 'IGNORED' | 'CARD_SETTLEMENT'

export type Suggestion = {
  expenseId: string
  date: string
  description: string
  supplier: string | null
  amount: number
  strong: boolean
}

export type StatementLine = {
  id: string
  source: 'BANK' | 'CARD'
  date: string
  // Money going out is positive.
  amount: number
  description: string
  reference: string | null
  status: LineStatus
  expenseId: string | null
  expenseDescription: string | null
  coveredByCardStatement: boolean
  suggestions: Suggestion[]
}

export type StatementFile = {
  id: string
  source: 'BANK' | 'CARD'
  fileName: string
  periodFrom: string | null
  periodTo: string | null
  totalOut: number
  lineCount: number
  pendingCount: number
  uploadedAt: string
}

export type UploadResult = {
  fileId: string
  fileWasAlreadyUploaded: boolean
  added: number
  alreadyKnown: number
  cardSettlements: number
  autoIgnored: number
  pending: number
}

export type MonthCheck = {
  month: string
  isClosed: boolean
  pendingCount: number
  settlementsWithoutCardStatement: { lineId: string; date: string; description: string; amount: number }[]
  expensesNotInStatements: { id: string; date: string; description: string; supplier: string | null; amount: number }[]
  canClose: boolean
}

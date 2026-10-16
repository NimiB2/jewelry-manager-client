import { apiFetch, apiJson } from '../api'
import type { MonthCheck, StatementFile, StatementLine, UploadResult } from './types'

export async function uploadStatement(file: File, source: 'Bank' | 'Card'): Promise<UploadResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('source', source)
  const response = await apiFetch('/statements/upload', { method: 'POST', body })
  if (!response.ok) {
    let message = 'ההעלאה נכשלה'
    try {
      message = (await response.json())?.error ?? message
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }
  return response.json()
}

export const getFiles = () => apiJson<StatementFile[]>('/statements/files')
export const deleteFile = (id: string) => apiJson<void>(`/statements/files/${id}`, { method: 'DELETE' })
export const getLines = (month: string) => apiJson<StatementLine[]>(`/statements/lines?month=${month}`)
export const getMonth = (month: string) => apiJson<MonthCheck>(`/statements/months/${month}`)
export const closeMonth = (month: string) => apiJson<void>(`/statements/months/${month}/close`, { method: 'POST' })
export const reopenMonth = (month: string) => apiJson<void>(`/statements/months/${month}/reopen`, { method: 'POST' })

export const matchLine = (id: string, expenseId: string) =>
  apiJson<void>(`/statements/lines/${id}/match`, { method: 'POST', body: JSON.stringify({ expenseId }) })
export const createExpenseFromLine = (id: string, body: { typeName: string | null; groupName: string | null; supplier: string | null }) =>
  apiJson<unknown>(`/statements/lines/${id}/create-expense`, { method: 'POST', body: JSON.stringify(body) })
export const ignoreLine = (id: string) => apiJson<void>(`/statements/lines/${id}/ignore`, { method: 'POST' })
export const markSettlement = (id: string) => apiJson<void>(`/statements/lines/${id}/mark-settlement`, { method: 'POST' })
export const resetLine = (id: string) => apiJson<void>(`/statements/lines/${id}/reset`, { method: 'POST' })

export const getKeywords = () => apiJson<string[]>('/statements/settlement-keywords')
export const saveKeywords = (keywords: string[]) =>
  apiJson<string[]>('/statements/settlement-keywords', { method: 'PUT', body: JSON.stringify({ keywords }) })

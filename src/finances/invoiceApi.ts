import { apiFetch } from '../api'

async function failIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  let message = `HTTP ${response.status}`
  try {
    const body = await response.json()
    message = body?.error ?? body?.title ?? message
  } catch {
    // keep the status-code message
  }
  throw new Error(message)
}

export async function attachInvoice(expenseId: string, file: File): Promise<void> {
  const body = new FormData()
  body.append('file', file)
  await failIfNotOk(await apiFetch(`/expenses/${expenseId}/invoice`, { method: 'POST', body }))
}

export async function removeInvoice(expenseId: string): Promise<void> {
  await failIfNotOk(await apiFetch(`/expenses/${expenseId}/invoice`, { method: 'DELETE' }))
}

// The file is private: it is fetched with the sign-in token and shown from a temporary local address.
export async function openInvoice(expenseId: string): Promise<void> {
  // The window is opened first, inside the tap, so a phone's pop-up blocker lets it through.
  const win = window.open('', '_blank')
  try {
    const response = await apiFetch(`/expenses/${expenseId}/invoice`)
    await failIfNotOk(response)
    const url = URL.createObjectURL(await response.blob())
    if (win) win.location.href = url
    else window.location.href = url
  } catch (err) {
    win?.close()
    throw err
  }
}

export async function downloadFile(path: string, fileName: string): Promise<void> {
  const response = await apiFetch(path)
  await failIfNotOk(response)
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export type InvoiceSuggestion = {
  amount: number | null
  date: string | null
  supplier: string | null
  description: string | null
  typeName: string | null
}

export async function isInvoiceReaderAvailable(): Promise<boolean> {
  const response = await apiFetch('/invoices/reader')
  if (!response.ok) return false
  return Boolean((await response.json()).available)
}

// Asks the reader for the details on an invoice. Nothing is saved; null means nothing could be read.
export async function readInvoice(file: File): Promise<InvoiceSuggestion | null> {
  const body = new FormData()
  body.append('file', file)
  const response = await apiFetch('/invoices/read', { method: 'POST', body })
  await failIfNotOk(response)
  return (await response.json()).suggestion ?? null
}

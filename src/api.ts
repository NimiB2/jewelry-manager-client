import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Writes that haven't finished yet. A read waits for them, so a screen that opens right after an
// edit (e.g. settings autosave flushing as she taps "Products") always sees the saved data.
const pendingWrites = new Set<Promise<unknown>>()

// Every server call goes through here so the auth token and 401 handling stay in one place.
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const isRead = (init.method ?? 'GET').toUpperCase() === 'GET'
  const request = send(path, init, isRead)

  if (!isRead) {
    pendingWrites.add(request)
    const done = () => pendingWrites.delete(request)
    request.then(done, done)
  }

  return request
}

async function send(path: string, init: RequestInit, isRead: boolean): Promise<Response> {
  if (isRead && pendingWrites.size > 0) await Promise.allSettled([...pendingWrites])

  const token = await auth.currentUser?.getIdToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (response.status === 401) {
    // Server no longer recognizes this session — send the user back to sign-in.
    await auth.signOut()
  }

  return response
}

// A failed call. `code` is set when the server wants the user to confirm something (status 409),
// e.g. PRODUCT_ALREADY_LINKED; the message is already written for the user.
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code: string | null) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Same as apiFetch, but parses JSON and turns a failed response into an Error carrying the
// server's message, so screens can just try/catch.
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = init.body ? { 'Content-Type': 'application/json', ...init.headers } : (init.headers ?? {})
  const response = await apiFetch(path, { ...init, headers })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    let code: string | null = null
    try {
      const body = await response.json()
      message = body?.error ?? body?.title ?? message
      code = typeof body?.code === 'string' ? body.code : null
    } catch {
      // keep the status-code message
    }
    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

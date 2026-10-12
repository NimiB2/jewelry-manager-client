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

const RETRY_DELAYS_MS = [1500, 3000, 6000]

async function send(path: string, init: RequestInit, isRead: boolean): Promise<Response> {
  if (isRead && pendingWrites.size > 0) await Promise.allSettled([...pendingWrites])

  const token = await auth.currentUser?.getIdToken()

  const options: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  }

  // A read that cannot reach the server at all (typically for a minute after an update, while it restarts)
  // is tried again a few times by itself. A write is never repeated automatically: it might have gone through.
  let response: Response | null = null
  for (let attempt = 0; response === null; attempt++) {
    try {
      response = await fetch(`${API_URL}${path}`, options)
    } catch {
      if (isRead && attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
        continue
      }

      throw new ApiError(
        isRead ? 'אין חיבור לשרת כרגע. אם זה קורה אחרי עדכון, כדאי לנסות שוב בעוד דקה' : 'אין חיבור לשרת, והפעולה לא נשמרה. נסי שוב',
        0,
        'NETWORK',
      )
    }
  }

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

    // The server's own words for "something broke" are English and say nothing; say it plainly instead.
    if (response.status >= 500 || message === 'An unexpected error occurred') {
      message = 'משהו השתבש בשרת. כדאי לנסות שוב, ואם זה חוזר להגיד לי'
    }

    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

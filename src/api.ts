import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Every server call goes through here so the auth token and 401 handling stay in one place.
export async function apiFetch(path: string, init: RequestInit = {}) {
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

// Same as apiFetch, but parses JSON and turns a failed response into an Error carrying the
// server's message, so screens can just try/catch.
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = init.body ? { 'Content-Type': 'application/json', ...init.headers } : (init.headers ?? {})
  const response = await apiFetch(path, { ...init, headers })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = await response.json()
      message = body?.error ?? body?.title ?? message
    } catch {
      // keep the status-code message
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

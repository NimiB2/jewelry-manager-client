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

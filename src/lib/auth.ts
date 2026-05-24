export type AuthUser = {
  id: string
  email?: string
  name?: string
  picture?: string
}

export type AuthState = {
  token: string
  user: AuthUser
}

const STORAGE_KEY = 'kirasolar.auth'

export function getAuthState(): AuthState | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthState
  } catch {
    return null
  }
}

export function setAuthState(state: AuthState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event('kirasolar:auth'))
}

export function clearAuthState(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('kirasolar:auth'))
}

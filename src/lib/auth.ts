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
    const parsed = JSON.parse(raw) as AuthState
    // Guard against malformed/corrupted entries (e.g. missing token field).
    if (!parsed || typeof parsed !== 'object' || typeof parsed.token !== 'string') {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Returns true if the response indicates the session is no longer valid.
 * On 401, the cached auth state is cleared so the UI drops out of the
 * authenticated view instead of replaying a dead token on every retry.
 */
export function handleAuthFailure(response: Response): boolean {
  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuthState()
    return true
  }
  return false
}

export function setAuthState(state: AuthState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event('kirasolar:auth'))
}

export function clearAuthState(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('kirasolar:auth'))
}

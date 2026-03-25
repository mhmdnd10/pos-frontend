export interface AuthSession<TUser = unknown> {
  token: string
  user?: TUser
}

const TOKEN_STORAGE_KEY = 'pos_admin_token'
const USER_STORAGE_KEY = 'pos_admin_user'

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAuthSession<TUser>(session: AuthSession<TUser>) {
  localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
  if (session.user !== undefined) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user))
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

export function getStoredUser<TUser>() {
  const value = localStorage.getItem(USER_STORAGE_KEY)
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as TUser
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}
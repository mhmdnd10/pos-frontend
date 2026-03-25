import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { authService } from '@/features/auth/services/authService'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@/features/auth/types'
import { setUnauthorizedHandler } from '@/lib/api/httpClient'
import { clearAuthSession, getAuthToken, getStoredUser, setAuthSession } from '@/lib/api/session'

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (payload: LoginRequest) => Promise<void>
  register: (payload: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  setAuthData: (payload: AuthResponse) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => getAuthToken())
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>())

  const clearAuthData = useCallback(() => {
    clearAuthSession()
    setToken(null)
    setUser(null)
  }, [])

  const setAuthData = useCallback((payload: AuthResponse) => {
    setAuthSession<AuthUser>({ token: payload.token, user: payload.user ?? undefined })
    setToken(payload.token)
    setUser(payload.user)
  }, [])

  const login = useCallback(async (payload: LoginRequest) => {
    const data = await authService.login(payload)
    setAuthData(data)
  }, [setAuthData])

  const register = useCallback(async (payload: RegisterRequest) => {
    const data = await authService.register(payload)
    setAuthData(data)
  }, [setAuthData])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      toast.error('Session closed locally due to network/API issue.')
    } finally {
      clearAuthData()
    }
  }, [clearAuthData])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthData()
      window.location.assign('/login')
    })
  }, [clearAuthData])

  const contextValue = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      setAuthData,
    }),
    [token, user, login, register, logout, setAuthData],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return value
}
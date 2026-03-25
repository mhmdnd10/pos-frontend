import { endpoints } from '@/lib/constants/endpoints'
import { httpClient } from '@/lib/api/httpClient'
import type {
  AuthMessageResponse,
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RawAuthResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from '@/features/auth/types'

function normalizeAuthResponse(payload: RawAuthResponse): AuthResponse {
  const token = payload.token ?? payload.access_token ?? payload.data?.token ?? payload.data?.access_token
  const user = payload.user ?? payload.data?.user ?? null

  if (!token) {
    throw new Error('Invalid auth response: token/access_token is missing')
  }

  return {
    token,
    user,
  }
}

export const authService = {
  async register(payload: RegisterRequest) {
    const { data } = await httpClient.post<RawAuthResponse>(endpoints.auth.register, payload)
    return normalizeAuthResponse(data)
  },

  async login(payload: LoginRequest) {
    const { data } = await httpClient.post<RawAuthResponse>(endpoints.auth.login, payload)
    return normalizeAuthResponse(data)
  },

  async forgotPassword(payload: ForgotPasswordRequest) {
    const { data } = await httpClient.post<AuthMessageResponse>(endpoints.auth.forgotPassword, payload)
    return data
  },

  async resetPassword(payload: ResetPasswordRequest) {
    const { data } = await httpClient.post<AuthMessageResponse>(endpoints.auth.resetPassword, payload)
    return data
  },

  async logout() {
    const { data } = await httpClient.post<AuthMessageResponse>(endpoints.auth.logout)
    return data
  },

  async changePassword(payload: ChangePasswordRequest) {
    const { data } = await httpClient.post<AuthMessageResponse>(endpoints.auth.changePassword, payload)
    return data
  },
}
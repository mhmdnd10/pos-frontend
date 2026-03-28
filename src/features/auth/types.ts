export interface AuthUser {
  id: number
  name: string
  email: string
  shop_id?: number
  shopId?: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  password_confirmation: string
  role?: 'admin' | 'cashier'
  shop_id?: number | null
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  password: string
  password_confirmation: string
  token: string
}

export interface ChangePasswordRequest {
  current_password: string
  password: string
  password_confirmation: string
}

export interface AuthResponse {
  token: string
  user: AuthUser | null
}

export interface RawAuthResponse {
  token?: string
  access_token?: string
  user?: AuthUser
  data?: {
    token?: string
    access_token?: string
    user?: AuthUser
  }
}

export interface AuthMessageResponse {
  message: string
}
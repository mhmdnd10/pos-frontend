import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(8, 'Password confirmation must be at least 8 characters'),
  })
  .refine((payload) => payload.password === payload.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
})

export const resetPasswordSchema = z
  .object({
    email: z.email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(8, 'Password confirmation must be at least 8 characters'),
    token: z.string().min(1, 'Token is required'),
  })
  .refine((payload) => payload.password === payload.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(8, 'Password confirmation must be at least 8 characters'),
  })
  .refine((payload) => payload.password === payload.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterSchema = z.infer<typeof registerSchema>
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>
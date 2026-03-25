import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { FormField } from '@/components/shared/forms/FormField'
import { Button } from '@/components/shared/ui/button'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'
import { resetPasswordSchema, type ResetPasswordSchema } from '@/features/auth/schemas'
import { authService } from '@/features/auth/services/authService'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const email = useMemo(() => searchParams.get('email') ?? '', [searchParams])

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email,
      token,
      password: '',
      password_confirmation: '',
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: (response) => {
      toast.success(response.message || 'Password has been reset successfully.')
      form.reset({ email: '', token: '', password: '', password_confirmation: '' })
    },
    onError: () => {
      toast.error('Reset password request failed.')
    },
  })

  return (
    <AuthFormLayout
      title="Reset password"
      description="Set a new password for your account"
      footerText="Back to login?"
      footerLinkLabel="Sign in"
      footerLinkTo={routePaths.login}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => resetPasswordMutation.mutate(values))}>
        <FormField form={form} name="token" label="Reset token" type="text" placeholder="Paste token" />
        <FormField form={form} name="email" label="Email" type="email" placeholder="admin@example.com" autoComplete="email" />
        <FormField
          form={form}
          name="password"
          label="New password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <FormField
          form={form}
          name="password_confirmation"
          label="Confirm new password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <Button className="w-full" type="submit" disabled={resetPasswordMutation.isPending}>
          {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </AuthFormLayout>
  )
}
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { FormField } from '@/components/shared/forms/FormField'
import { Button } from '@/components/shared/ui/button'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'
import { forgotPasswordSchema, type ForgotPasswordSchema } from '@/features/auth/schemas'
import { authService } from '@/features/auth/services/authService'

export function ForgotPasswordPage() {
  const navigate = useNavigate()

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: (response, variables) => {
      toast.success(response.message || 'Password reset code sent.')
      navigate(`${routePaths.forgotPasswordSent}?email=${encodeURIComponent(variables.email)}`, { replace: true })
    },
    onError: () => {
      toast.error('Unable to send reset link.')
    },
  })

  return (
    <AuthFormLayout
      title="Forgot password"
      description="Enter your account email to receive a reset code"
      footerText="Remember your password?"
      footerLinkLabel="Sign in"
      footerLinkTo={routePaths.login}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => forgotPasswordMutation.mutate(values))}>
        <FormField form={form} name="email" label="Email" type="email" placeholder="admin@example.com" autoComplete="email" />
        <Button className="w-full" type="submit" disabled={forgotPasswordMutation.isPending}>
          {forgotPasswordMutation.isPending ? 'Sending...' : 'Send reset code'}
        </Button>
      </form>
    </AuthFormLayout>
  )
}
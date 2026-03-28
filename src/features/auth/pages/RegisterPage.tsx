import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { FormField } from '@/components/shared/forms/FormField'
import { Button } from '@/components/shared/ui/button'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { registerSchema, type RegisterSchema } from '@/features/auth/schemas'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  })

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (response, variables) => {
      toast.success(response.message || 'Account created. Verification email sent.')
      navigate(`${routePaths.registerVerificationSent}?email=${encodeURIComponent(variables.email)}`, { replace: true })
    },
    onError: () => {
      toast.error('Registration failed. Please check your details.')
    },
  })

  return (
    <AuthFormLayout
      title="Create account"
      description="Register a new POS Admin user"
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo={routePaths.login}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          registerMutation.mutate({
            ...values,
            role: 'admin',
          })
        )}
      >
        <FormField form={form} name="name" label="Name" type="text" placeholder="Admin User" autoComplete="name" />
        <FormField form={form} name="email" label="Email" type="email" placeholder="admin@example.com" autoComplete="email" />
        <FormField
          form={form}
          name="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <FormField
          form={form}
          name="password_confirmation"
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthFormLayout>
  )
}
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { FormField } from '@/components/shared/forms/FormField'
import { Button } from '@/components/shared/ui/button'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { loginSchema, type LoginSchema } from '@/features/auth/schemas'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const from =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'object' &&
    location.state.from !== null &&
    'pathname' in location.state.from &&
    typeof location.state.from.pathname === 'string'
      ? location.state.from.pathname
      : routePaths.dashboard

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      toast.success('Welcome back.')
      navigate(from, { replace: true })
    },
    onError: () => {
      toast.error('Login failed. Check your credentials and try again.')
    },
  })

  return (
    <AuthFormLayout
      title="Sign in"
      description="Access your POS Admin dashboard"
      footerText="Don’t have an account?"
      footerLinkLabel="Register"
      footerLinkTo={routePaths.register}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
        <FormField form={form} name="email" label="Email" type="email" placeholder="admin@example.com" autoComplete="email" />
        <FormField
          form={form}
          name="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between">
          <Link className="text-sm text-primary hover:underline" to={routePaths.forgotPassword}>
            Forgot password?
          </Link>
        </div>
        <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthFormLayout>
  )
}
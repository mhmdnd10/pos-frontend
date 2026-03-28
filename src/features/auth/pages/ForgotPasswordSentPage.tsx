import { Link, useSearchParams } from 'react-router-dom'
import { routePaths } from '@/app/router/routePaths'
import { Button } from '@/components/shared/ui/button'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'

export function ForgotPasswordSentPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')

  return (
    <AuthFormLayout
      title="Check your email"
      description="We sent your password reset code."
      footerText="Remembered your password?"
      footerLinkLabel="Sign in"
      footerLinkTo={routePaths.login}
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Use the reset code sent{email ? ` to ${email}` : ''} to set your new password.</p>
        <p>Open the reset password page and enter your email, code, and new password.</p>
      </div>

      <div className="grid gap-2">
        <Button asChild>
          <Link to={routePaths.resetPassword}>Continue to reset password</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={routePaths.forgotPassword}>Resend reset code</Link>
        </Button>
      </div>
    </AuthFormLayout>
  )
}

import { Link, useSearchParams } from 'react-router-dom'
import { routePaths } from '@/app/router/routePaths'
import { Button } from '@/components/shared/ui/button'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'

export function RegisterVerificationSentPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')

  return (
    <AuthFormLayout
      title="Verify your email"
      description="Your account was created. We sent a verification email to activate your account."
      footerText="Already verified?"
      footerLinkLabel="Sign in"
      footerLinkTo={routePaths.login}
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Check your inbox{email ? ` at ${email}` : ''} and click the verification link to continue.
        </p>
        <p>If you do not see the email, check your spam or junk folder.</p>
      </div>

      <div className="grid gap-2">
        <Button asChild>
          <Link to={routePaths.login}>Go to sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={routePaths.register}>Back to register</Link>
        </Button>
      </div>
    </AuthFormLayout>
  )
}

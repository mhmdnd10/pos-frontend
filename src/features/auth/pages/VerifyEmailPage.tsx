import { useParams } from 'react-router-dom'
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout'

export function VerifyEmailPage() {
  const { token } = useParams()

  return (
    <AuthFormLayout
      title="Email verification"
      description="Verification token received. Backend verification endpoint can be connected in the next phase."
    >
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Token: <span className="font-medium text-foreground">{token ?? 'N/A'}</span>
      </div>
    </AuthFormLayout>
  )
}
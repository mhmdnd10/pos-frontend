import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/forms/FormField'
import { Button } from '@/components/shared/ui/button'
import { changePasswordSchema, type ChangePasswordSchema } from '@/features/auth/schemas'
import { authService } from '@/features/auth/services/authService'

export function ChangePasswordPage() {
  const form = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: (response) => {
      toast.success(response.message || 'Password changed successfully.')
      form.reset()
    },
    onError: () => {
      toast.error('Failed to change password.')
    },
  })

  return (
    <div className="max-w-xl">
      <PageHeader title="Change Password" description="Update your account password" />
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => changePasswordMutation.mutate(values))}>
        <FormField
          form={form}
          name="current_password"
          label="Current password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
        />
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
        <Button type="submit" disabled={changePasswordMutation.isPending}>
          {changePasswordMutation.isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}
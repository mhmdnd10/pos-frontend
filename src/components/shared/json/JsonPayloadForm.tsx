import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/shared/ui/button'
import { Textarea } from '@/components/shared/ui/textarea'

const jsonPayloadSchema = z.object({
  payload: z.string().min(2, 'JSON payload is required'),
})

type JsonPayloadSchema = z.infer<typeof jsonPayloadSchema>

interface JsonPayloadFormProps {
  defaultPayload: Record<string, unknown>
  onSubmit: (payload: Record<string, unknown>) => void
  submitLabel: string
  isLoading?: boolean
}

export function JsonPayloadForm({ defaultPayload, onSubmit, submitLabel, isLoading = false }: JsonPayloadFormProps) {
  const defaultValue = useMemo(() => JSON.stringify(defaultPayload, null, 2), [defaultPayload])

  const form = useForm<JsonPayloadSchema>({
    resolver: zodResolver(jsonPayloadSchema),
    defaultValues: {
      payload: defaultValue,
    },
  })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => {
        try {
          const parsed = JSON.parse(values.payload) as Record<string, unknown>
          onSubmit(parsed)
        } catch {
          form.setError('payload', { message: 'Invalid JSON format' })
        }
      })}
    >
      <Textarea rows={14} {...form.register('payload')} />
      {form.formState.errors.payload?.message ? (
        <p className="text-xs text-destructive">{form.formState.errors.payload.message}</p>
      ) : null}
      <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : submitLabel}</Button>
    </form>
  )
}

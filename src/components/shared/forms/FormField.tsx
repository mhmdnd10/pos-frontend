import type { InputHTMLAttributes } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'

interface FormFieldProps<TFormValues extends FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'form'> {
  form: UseFormReturn<TFormValues>
  name: Path<TFormValues>
  label: string
}

export function FormField<TFormValues extends FieldValues>({
  form,
  name,
  label,
  ...inputProps
}: FormFieldProps<TFormValues>) {
  const fieldError = form.formState.errors[name]
  const errorMessage = typeof fieldError?.message === 'string' ? fieldError.message : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} aria-invalid={Boolean(errorMessage)} {...form.register(name)} {...inputProps} />
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
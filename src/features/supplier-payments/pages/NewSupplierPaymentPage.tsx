import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/forms/FormField'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'
import { supplierPaymentService } from '@/features/supplier-payments/services/supplierPaymentService'
import { supplierService } from '@/features/suppliers/services/supplierService'

const schema = z.object({
  supplier_id: z.string().min(1, 'Please select a supplier'),
  amount: z.string().min(1, 'Amount is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  paid_at: z.string().min(1, 'Payment date is required'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function NewSupplierPaymentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: '',
      amount: '',
      payment_method: 'cash',
      paid_at: new Date().toISOString().slice(0, 10),
      note: '',
    },
  })

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers.all, 'for-payment-form'],
    queryFn: () => supplierService.list(1),
  })

  const createMutation = useMutation({
    mutationFn: supplierPaymentService.create,
    onSuccess: async (response) => {
      const createdId = Number(response.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierPayments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all }),
      ])
      toast.success('Supplier payment created successfully.')
      if (Number.isFinite(createdId)) {
        navigate(`/supplier-payments/${createdId}`)
      } else {
        navigate('/supplier-payments')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create supplier payment.')),
  })

  return (
    <div className="max-w-3xl">
      <PageHeader title="New Supplier Payment" description="Create supplier payment with a clean form" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => {
              const supplierId = Number(values.supplier_id)
              const amount = Number(values.amount)

              if (!Number.isFinite(supplierId) || supplierId <= 0) {
                form.setError('supplier_id', { message: 'Please select a supplier' })
                return
              }

              if (!Number.isFinite(amount) || amount <= 0) {
                form.setError('amount', { message: 'Amount must be greater than 0' })
                return
              }

              createMutation.mutate({
                supplier_id: supplierId,
                amount,
                payment_method: values.payment_method,
                paid_at: values.paid_at,
                payment_date: values.paid_at,
                note: values.note,
              })
            })}
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supplier_id">Supplier</Label>
              <select
                id="supplier_id"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('supplier_id')}
              >
                <option value="">Select supplier</option>
                {(suppliersQuery.data?.items ?? []).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.phone ? `(${supplier.phone})` : ''}
                  </option>
                ))}
              </select>
              {form.formState.errors.supplier_id?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.supplier_id.message}</p>
              ) : null}
              {suppliersQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading suppliers...</p> : null}
            </div>

            <FormField form={form} name="amount" label="Amount" type="number" step="0.01" placeholder="0.00" />
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('payment_method')}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
              {form.formState.errors.payment_method?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.payment_method.message}</p>
              ) : null}
            </div>
            <FormField form={form} name="paid_at" label="Payment Date" type="date" />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" rows={4} placeholder="Optional note" {...form.register('note')} />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || suppliersQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create Payment'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/supplier-payments')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

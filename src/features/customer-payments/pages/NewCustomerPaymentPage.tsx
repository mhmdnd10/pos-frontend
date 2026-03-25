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
import { customerPaymentService } from '@/features/customer-payments/services/customerPaymentService'
import { customerService } from '@/features/customers/services/customerService'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const schema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  amount: z.string().min(1, 'Amount is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  paid_at: z.string().min(1, 'Payment date is required'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function NewCustomerPaymentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: '',
      amount: '',
      payment_method: 'cash',
      paid_at: new Date().toISOString().slice(0, 10),
      note: '',
    },
  })

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers.all, 'for-payment-form'],
    queryFn: () => customerService.list(1),
  })

  const createMutation = useMutation({
    mutationFn: customerPaymentService.create,
    onSuccess: async (response) => {
      const createdId = Number(response.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.customerPayments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
      ])
      toast.success('Customer payment created successfully.')
      if (Number.isFinite(createdId)) {
        navigate(`/customer-payments/${createdId}`)
      } else {
        navigate('/customer-payments')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create customer payment.')),
  })

  return (
    <div className="max-w-3xl">
      <PageHeader title="New Customer Payment" description="Create customer payment with a clean form" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => {
              const customerId = Number(values.customer_id)
              const amount = Number(values.amount)

              if (!Number.isFinite(customerId) || customerId <= 0) {
                form.setError('customer_id', { message: 'Please select a customer' })
                return
              }

              if (!Number.isFinite(amount) || amount <= 0) {
                form.setError('amount', { message: 'Amount must be greater than 0' })
                return
              }

              createMutation.mutate({
                customer_id: customerId,
                amount,
                payment_method: values.payment_method,
                paid_at: values.paid_at,
                payment_date: values.paid_at,
                note: values.note,
              })
            })}
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customer_id">Customer</Label>
              <select
                id="customer_id"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('customer_id')}
              >
                <option value="">Select customer</option>
                {(customersQuery.data?.items ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </option>
                ))}
              </select>
              {form.formState.errors.customer_id?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.customer_id.message}</p>
              ) : null}
              {customersQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading customers...</p> : null}
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
              <Button type="submit" disabled={createMutation.isPending || customersQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create Payment'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/customer-payments')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

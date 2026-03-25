import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { customerService } from '@/features/customers/services/customerService'
import { productService } from '@/features/products/services/productService'
import { saleService } from '@/features/sales/services/saleService'
import { getStoredUser } from '@/lib/api/session'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const lineItemSchema = z.object({
  product_id: z.string().min(1, 'Select product'),
  quantity: z.string().min(1, 'Quantity required'),
  unit_price: z.string().min(1, 'Price required'),
})

const saleSchema = z.object({
  customer_id: z.string().optional(),
  sale_date: z.string().min(1, 'Date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  paid_amount: z.string().min(1, 'Paid amount is required'),
  note: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
})

type SaleForm = z.infer<typeof saleSchema>

function toPositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toPositiveInteger(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toNonNegativeNumber(value?: string) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function NewSalePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const walkInCustomerId = Number(import.meta.env.VITE_WALKIN_CUSTOMER_ID ?? '')

  const form = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: '',
      sale_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      paid_amount: '0',
      note: '',
      items: [{ product_id: '', quantity: '1', unit_price: '0' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers.all, 'for-sale-form'],
    queryFn: () => customerService.list(1),
  })

  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.all, 'for-sale-form'],
    queryFn: () => productService.list(1),
  })

  const watchedItems = useWatch({ control: form.control, name: 'items' })
  const watchedPaidAmount = useWatch({ control: form.control, name: 'paid_amount' })

  const subtotal = useMemo(
    () =>
      watchedItems.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0)
        const price = Number(item.unit_price || 0)
        return sum + quantity * price
      }, 0),
    [watchedItems],
  )

  const total = Math.max(subtotal, 0)
  const paidAmount = toNonNegativeNumber(watchedPaidAmount)
  const dueAmount = Math.max(total - paidAmount, 0)

  const createMutation = useMutation({
    mutationFn: saleService.create,
    onSuccess: async (response) => {
      const createdId = Number(response.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
      ])
      toast.success('Sale created successfully.')
      if (Number.isFinite(createdId)) {
        navigate(`/sales/${createdId}`)
      } else {
        navigate('/sales')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create sale.')),
  })

  return (
    <div className="max-w-5xl">
      <PageHeader title="New Sale" description="Create a sale with customer, item lines, and totals" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sale Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((values) => {
              const storedUser = getStoredUser<Record<string, unknown>>()
              const resolvedShopId = Number(storedUser?.shop_id ?? storedUser?.shopId ?? import.meta.env.VITE_SHOP_ID ?? '')

              if (!Number.isFinite(resolvedShopId) || resolvedShopId <= 0) {
                toast.error('Missing shop ID. Please login again or set VITE_SHOP_ID.')
                return
              }

              const selectedCustomerId = Number(values.customer_id ?? '')
              const hasSelectedCustomer = Number.isFinite(selectedCustomerId) && selectedCustomerId > 0
              const hasWalkInCustomer = Number.isFinite(walkInCustomerId) && walkInCustomerId > 0
              const customerId = hasSelectedCustomer ? selectedCustomerId : hasWalkInCustomer ? walkInCustomerId : null

              if (!customerId) {
                form.setError('customer_id', {
                  message: 'Select customer or configure VITE_WALKIN_CUSTOMER_ID for walk-in sales',
                })
                return
              }

              const parsedItems = values.items
                .map((item, index) => {
                  const productId = toPositiveNumber(item.product_id)
                  const quantity = toPositiveInteger(item.quantity)
                  const unitPrice = toPositiveNumber(item.unit_price)

                  if (!productId) {
                    form.setError(`items.${index}.product_id`, { message: 'Select product' })
                    return null
                  }

                  if (!quantity) {
                    form.setError(`items.${index}.quantity`, { message: 'Enter valid quantity' })
                    return null
                  }

                  if (!unitPrice) {
                    form.setError(`items.${index}.unit_price`, { message: 'Enter valid unit price' })
                    return null
                  }

                  return {
                    product_id: productId,
                    quantity,
                    unit_price: unitPrice,
                    line_total: quantity * unitPrice,
                  }
                })
                .filter((item): item is { product_id: number; quantity: number; unit_price: number; line_total: number } => item !== null)

              if (parsedItems.length !== values.items.length) {
                return
              }

              if (paidAmount < 0) {
                form.setError('paid_amount', { message: 'Paid amount cannot be negative' })
                return
              }

              createMutation.mutate({
                customer_id: customerId,
                shop_id: resolvedShopId,
                sale_date: values.sale_date,
                date: values.sale_date,
                payment_method: values.payment_method,
                subtotal,
                total_amount: total,
                paid_amount: paidAmount,
                due_amount: dueAmount,
                note: values.note,
                items: parsedItems,
              })
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer</Label>
                <select
                  id="customer_id"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register('customer_id')}
                >
                  <option value="">Select customer</option>
                  {(customersQuery.data?.items ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.customer_id?.message ? (
                  <p className="text-xs text-destructive">{form.formState.errors.customer_id.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Leave empty for walk-in sale if `VITE_WALKIN_CUSTOMER_ID` is configured.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_date">Sale Date</Label>
                <Input id="sale_date" type="date" {...form.register('sale_date')} />
                {form.formState.errors.sale_date?.message ? (
                  <p className="text-xs text-destructive">{form.formState.errors.sale_date.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ product_id: '', quantity: '1', unit_price: '0' })}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-12">
                  <div className="md:col-span-5 space-y-2">
                    <Label>Product</Label>
                    {(() => {
                      const productField = form.register(`items.${index}.product_id`)
                      return (
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      {...productField}
                      onChange={(event) => {
                        productField.onChange(event)
                        const selectedProductId = Number(event.target.value)
                        const selectedProduct = (productsQuery.data?.items ?? []).find((product) => product.id === selectedProductId)
                        const productPrice = Number(selectedProduct?.sale_price ?? selectedProduct?.price ?? 0)

                        if (Number.isFinite(productPrice) && productPrice > 0) {
                          form.setValue(`items.${index}.unit_price`, String(productPrice), {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                      }}
                    >
                      <option value="">Select product</option>
                      {(productsQuery.data?.items ?? []).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                      )
                    })()}
                    {form.formState.errors.items?.[index]?.product_id?.message ? (
                      <p className="text-xs text-destructive">{form.formState.errors.items[index]?.product_id?.message}</p>
                    ) : null}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Qty</Label>
                    <Input type="number" min="1" step="1" {...form.register(`items.${index}.quantity`)} />
                    {form.formState.errors.items?.[index]?.quantity?.message ? (
                      <p className="text-xs text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>
                    ) : null}
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label>Unit Price</Label>
                    <Input type="number" min="0" step="0.01" {...form.register(`items.${index}.unit_price`)} />
                    {form.formState.errors.items?.[index]?.unit_price?.message ? (
                      <p className="text-xs text-destructive">{form.formState.errors.items[index]?.unit_price?.message}</p>
                    ) : null}
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <Button type="button" variant="destructive" size="sm" disabled={fields.length === 1} onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paid_amount">Paid Amount</Label>
                <Input id="paid_amount" type="number" min="0" step="0.01" {...form.register('paid_amount')} />
              </div>
              <div className="space-y-2">
                <Label>Due Amount</Label>
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">{dueAmount.toFixed(2)}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" rows={4} placeholder="Optional note" {...form.register('note')} />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-lg font-semibold">{total.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || customersQuery.isLoading || productsQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create Sale'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/sales')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

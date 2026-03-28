import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductSearchSelect } from '@/components/shared/forms/ProductSearchSelect'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { purchaseService } from '@/features/purchases/services/purchaseService'
import { supplierService } from '@/features/suppliers/services/supplierService'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const lineItemSchema = z.object({
  product_id: z.string().min(1, 'Select product'),
  quantity: z.string().min(1, 'Quantity required'),
  unit_price: z.string().min(1, 'Price required'),
})

const purchaseSchema = z.object({
  supplier_id: z.string().min(1, 'Select supplier'),
  purchase_date: z.string().min(1, 'Date is required'),
  paid_amount: z.string().min(1, 'Paid amount is required'),
  note: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
})

type PurchaseForm = z.infer<typeof purchaseSchema>

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
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function NewPurchasePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: '',
      purchase_date: new Date().toISOString().slice(0, 10),
      paid_amount: '0',
      note: '',
      items: [{ product_id: '', quantity: '1', unit_price: '0' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers.all, 'for-purchase-form'],
    queryFn: () => supplierService.list(1),
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
  const paidAmount = toNonNegativeNumber(watchedPaidAmount) ?? 0
  const remainingAmount = Math.max(subtotal - paidAmount, 0)

  const createMutation = useMutation({
    mutationFn: purchaseService.create,
    onSuccess: async (response) => {
      const createdId = Number(response.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
      ])
      toast.success('Purchase created successfully.')
      if (Number.isFinite(createdId)) {
        navigate(`/purchases/${createdId}`)
      } else {
        navigate('/purchases')
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create purchase.')),
  })

  return (
    <div className="max-w-5xl">
      <PageHeader title="New Purchase" description="Create a purchase with supplier, date, and item lines" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((values) => {
              const supplierId = Number(values.supplier_id)
              if (!Number.isFinite(supplierId) || supplierId <= 0) {
                form.setError('supplier_id', { message: 'Select supplier' })
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

              const submitPaidAmount = toNonNegativeNumber(values.paid_amount)
              if (submitPaidAmount === null) {
                form.setError('paid_amount', { message: 'Enter valid paid amount' })
                return
              }

              createMutation.mutate({
                supplier_id: supplierId,
                purchase_date: values.purchase_date,
                total_amount: subtotal,
                paid_amount: submitPaidAmount,
                note: values.note,
                items: parsedItems,
              })
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Supplier</Label>
                <select
                  id="supplier_id"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register('supplier_id')}
                >
                  <option value="">Select supplier</option>
                  {(suppliersQuery.data?.items ?? []).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.supplier_id?.message ? (
                  <p className="text-xs text-destructive">{form.formState.errors.supplier_id.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input id="purchase_date" type="date" {...form.register('purchase_date')} />
                {form.formState.errors.purchase_date?.message ? (
                  <p className="text-xs text-destructive">{form.formState.errors.purchase_date.message}</p>
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
                    <ProductSearchSelect
                      value={form.getValues(`items.${index}.product_id`)}
                      onClear={() => {
                        form.setValue(`items.${index}.product_id`, '', {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }}
                      onSelect={(product) => {
                        form.setValue(`items.${index}.product_id`, String(product.id), {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })

                        const purchasePrice = Number(product.purchase_price ?? product.cost_price ?? product.price ?? 0)
                        if (Number.isFinite(purchasePrice) && purchasePrice > 0) {
                          form.setValue(`items.${index}.unit_price`, String(purchasePrice), {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                      }}
                    />
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

              {form.formState.errors.items?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.items.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" rows={4} placeholder="Optional note" {...form.register('note')} />
              </div>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="paid_amount">Paid Amount</Label>
                  <Input id="paid_amount" type="number" min="0" step="0.01" {...form.register('paid_amount')} />
                  {form.formState.errors.paid_amount?.message ? (
                    <p className="text-xs text-destructive">{form.formState.errors.paid_amount.message}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border bg-muted/20 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-semibold">{subtotal.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-lg font-semibold">{remainingAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || suppliersQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create Purchase'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/purchases')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

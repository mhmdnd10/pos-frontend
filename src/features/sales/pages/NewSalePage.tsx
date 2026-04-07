import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { customerService } from '@/features/customers/services/customerService'
import { buildProductDisplayName } from '@/features/products/utils/productDisplay'
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

interface ParsedItem {
  product_id: number
  quantity: number
  unit_price: number
  line_total: number
}

interface SaleCreatePayload {
  customer_id: number | null
  shop_id: number
  sale_date: string
  date: string
  payment_method: string
  subtotal: number
  total_amount: number
  paid_amount: number
  due_amount: number
  note?: string
  items: ParsedItem[]
}

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface PrintableReceipt {
  invoiceNumber: string
  saleDate: string
  customerName: string
  customerPhone?: string
  items: ReceiptItem[]
  total: number
  paid: number
  remaining: number
}

interface ProductMeta {
  name: string
  salePrice: number
  purchasePrice: number
  availableQuantity: number
}

function parseNumericValue(value?: string) {
  const normalizedValue = (value ?? '').trim().replace(',', '.')
  const parsed = Number(normalizedValue)
  return Number.isFinite(parsed) ? parsed : null
}

function toPositiveNumber(value: string) {
  const parsed = parseNumericValue(value)
  return parsed !== null && parsed > 0 ? parsed : null
}

function toPositiveQuantity(value: string) {
  const parsed = parseNumericValue(value)
  return parsed !== null && parsed >= 1 ? parsed : null
}

function toNonNegativeNumber(value?: string) {
  const parsed = parseNumericValue(value)
  return parsed !== null && parsed >= 0 ? parsed : 0
}

function toNonNegativeNumberOrNull(value?: string) {
  const parsed = parseNumericValue(value)
  return parsed !== null && parsed >= 0 ? parsed : null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildReceiptHtml(receipt: PrintableReceipt) {
  const now = new Date()
  const lineWidth = 32
  const divider = '-'.repeat(lineWidth)

  const sanitizeText = (value: string) => value.trim()

  const formatMoney = (value: number) => value.toFixed(2)
  const formatKeyValue = (key: string, value: string) => `${key.padEnd(12)}: ${value}`

  const receiptDate = (() => {
    const [year, month, day] = receipt.saleDate.split('-')
    if (year && month && day) {
      return `${Number(day)}/${Number(month)}/${year}`
    }

    return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
  })()

  const receiptTime = (() => {
    const hours24 = now.getHours()
    const hours12 = hours24 % 12 || 12
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const suffix = hours24 >= 12 ? 'pm' : 'am'
    return `${hours12}:${minutes}${suffix}`
  })()

  const customerNameRaw =
    receipt.customerName && receipt.customerName !== 'Walk-in Customer' ? receipt.customerName : 'Walk-in Customer'
  const customerName = (sanitizeText(customerNameRaw) || 'Walk-in Customer').slice(0, lineWidth - 10).padEnd(lineWidth - 10)
  const customerPhone = sanitizeText(receipt.customerPhone?.trim() || '-') || '-'

  const formatQuantity = (value: number) => {
    const qty = Number(value)
    if (!Number.isFinite(qty)) {
      return '0'
    }

    return Number.isInteger(qty) ? String(qty) : qty.toFixed(2)
  }

  const itemRowsHtml = receipt.items
    .map((item) => {
      const itemName = sanitizeText(item.name) || '-'
      return `
        <tr>
          <td class="col-name">${escapeHtml(itemName)}</td>
          <td class="col-qty">${escapeHtml(formatQuantity(item.quantity))}</td>
          <td class="col-price">${escapeHtml(formatMoney(item.unitPrice))}</td>
          <td class="col-total">${escapeHtml(formatMoney(item.lineTotal))}</td>
        </tr>
      `
    })
    .join('')

  const receiptLines = [
    'HOME DECORATION',
    'AL QMATIYEH',
     'kmatieh-main street',
     '03109497 | 03909497',
    divider,
    formatKeyValue('Customer', customerName.trim()),
    formatKeyValue('Phone', customerPhone),
    divider,
    formatKeyValue('Invoice', sanitizeText(receipt.invoiceNumber) || 'Pending (save sale first)'),
    formatKeyValue('Date', receiptDate),
    formatKeyValue('Time', receiptTime),
    divider,
    formatKeyValue('Total Amount', formatMoney(receipt.total)),
    formatKeyValue('Paid Amount', formatMoney(receipt.paid)),
    formatKeyValue('Remaining', formatMoney(receipt.remaining)),
    divider,
    'شكرا لشرائكم',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]

  const headerLines = receiptLines.slice(0, 12)
  const footerLines = receiptLines.slice(12)

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Sale Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 1.5mm; }
          html, body { margin: 0; padding: 0; color: #111; }
          body { font-family: Tahoma, Arial, 'Noto Naskh Arabic', 'Segoe UI', sans-serif; font-size: 14px; }
          .receipt {
            width: 76mm;
            margin: 0;
            padding: 0.25mm 0 0 0;
            line-height: 1.25;
            text-align: left;
            direction: ltr;
            unicode-bidi: plaintext;
          }
          .receipt-line {
            white-space: normal;
            overflow-wrap: anywhere;
            margin: 0;
            line-height: 1.15;
          }
          .shop-name,
          .shop-subtitle,
          .shop-meta {
            color: #000;
            font-weight: 800;
          }
          .receipt-block {
            display: block;
            margin: 0;
            padding: 0;
          }
          .receipt-block + .receipt-block {
            margin-top: 1px;
          }
          .items {
            width: 100%;
            margin: 2px 0 0;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10px;
            color: #000;
          }
          .items th,
          .items td {
            border-bottom: 1px dashed #cbd5e1;
            padding: 0.5px 0;
            vertical-align: top;
            color: #000;
          }
          .items thead th {
            font-weight: 800;
            border-top: 1px dashed #cbd5e1;
            color: #000;
            font-size: 9px;
          }
          .items tbody td {
            font-weight: 800;
            font-size: 10px;
          }
          .col-name {
            width: 26%;
            text-align: left;
            direction: rtl;
            unicode-bidi: plaintext;
            word-break: break-word;
            overflow-wrap: anywhere;
            color: #000;
          }
          .col-qty {
            width: 14%;
            text-align: left;
            color: #000;
          }
          .col-price,
          .col-total {
            width: 30%;
            text-align: left;
            color: #000;
          }
          .totals {
            margin-top: 0;
            border-top: 1px dashed #475569;
            padding-top: 1px;
          }
          .total-row {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 1px;
            padding: 0;
            color: #000;
            font-weight: 800;
            font-size: 9px;
            line-height: 1;
          }
          .total-label {
            min-width: 0;
            flex: 0 1 auto;
            text-align: left;
            direction: rtl;
            unicode-bidi: plaintext;
            overflow-wrap: anywhere;
            color: #000;
            white-space: nowrap;
            font-size: 9px;
          }
          .total-value {
            text-align: left;
            min-width: 10mm;
            color: #000;
            flex: 0 0 auto;
            white-space: nowrap;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          ${headerLines
            .map((line, index) => {
              const className = index < 4 ? 'receipt-line shop-name' : index === 4 ? 'receipt-line' : 'receipt-line shop-meta'
              return `<div class="receipt-block ${className}">${escapeHtml(line)}</div>`
            })
            .join('')}
          <table class="items">
            <thead>
              <tr>
                <th class="col-name">العرض</th>
                <th class="col-qty">الكمية</th>
                <th class="col-price">السعر</th>
                <th class="col-total">المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml}
            </tbody>
          </table>
          <div class="totals">
            ${footerLines
              .map((line) => {
                if (!line.trim()) {
                  return ''
                }

                const separatorIndex = line.indexOf(':')
                if (separatorIndex === -1) {
                  return `<div class="receipt-line shop-meta">${escapeHtml(line)}</div>`
                }

                const rawLabel = line.slice(0, separatorIndex).trim()
                const label =
                  rawLabel === 'Total Amount'
                    ? 'المجموع'
                    : rawLabel === 'Paid Amount'
                      ? 'المدفوع'
                      : rawLabel === 'Remaining'
                        ? 'الباقي'
                        : rawLabel
                const value = line.slice(separatorIndex + 1).trim()
                return `
                  <div class="total-row">
                    <span class="total-label">${escapeHtml(label)}</span>
                    <span class="total-value">${escapeHtml(value)}</span>
                  </div>
                `
              })
              .join('')}
          </div>
        </div>
      </body>
    </html>
  `
}

export function NewSalePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('')
  const [productPickerValue, setProductPickerValue] = useState('')
  const [productNameById, setProductNameById] = useState<Record<number, string>>({})
  const [productMetaById, setProductMetaById] = useState<Record<number, ProductMeta>>({})
  const [lastPrintableReceipt, setLastPrintableReceipt] = useState<PrintableReceipt | null>(null)

  const form = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: '',
      sale_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      paid_amount: '0',
      note: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers.all, 'for-sale-form', debouncedCustomerSearch],
    queryFn: () => customerService.list(1, debouncedCustomerSearch),
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [customerSearch])

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
    mutationFn: (payload: SaleCreatePayload) => saleService.create(payload as unknown as Record<string, unknown>),
    onSuccess: async (response, variables) => {
      const createdId = Number(response.id)
      let invoiceNumber = typeof response.invoice_number === 'string' ? response.invoice_number : ''

      if (Number.isFinite(createdId) && createdId > 0) {
        try {
          invoiceNumber = await saleService.getInvoiceNumber(createdId)
        } catch {
          invoiceNumber = invoiceNumber || `INV-${String(createdId).padStart(6, '0')}`
        }
      }

      const receiptItems: ReceiptItem[] = variables.items.map((item) => ({
        name: productNameById[item.product_id] ?? `Product #${item.product_id}`,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
      }))

      setLastPrintableReceipt({
        invoiceNumber: invoiceNumber || 'N/A',
        saleDate: variables.sale_date,
        customerName: selectedCustomerName || 'Walk-in Customer',
        customerPhone: selectedCustomerPhone || undefined,
        items: receiptItems,
        total: variables.total_amount,
        paid: variables.paid_amount,
        remaining: Math.max(variables.total_amount - variables.paid_amount, 0),
      })

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

  function printReceipt(receipt: PrintableReceipt) {
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)

    const frameWindow = frame.contentWindow
    if (!frameWindow) {
      document.body.removeChild(frame)
      toast.error('Unable to initialize printer preview.')
      return
    }

    frameWindow.document.open()
    frameWindow.document.write(buildReceiptHtml(receipt))
    frameWindow.document.close()

    const runPrint = () => {
      try {
        frameWindow.focus()
        frameWindow.print()
      } finally {
        window.setTimeout(() => {
          if (document.body.contains(frame)) {
            document.body.removeChild(frame)
          }
        }, 1000)
      }
    }

    if (frameWindow.document.readyState === 'complete') {
      runPrint()
    } else {
      frame.onload = runPrint
    }
  }

  function buildDraftReceipt(values: SaleForm): PrintableReceipt | null {
    const draftItems = values.items
      .map((item) => {
        const productId = toPositiveNumber(item.product_id)
        const quantity = toPositiveQuantity(item.quantity)
        const unitPrice = toNonNegativeNumberOrNull(item.unit_price)

        if (!productId || !quantity || unitPrice === null) {
          return null
        }

        return {
          name: productNameById[productId] ?? `Product #${productId}`,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
        }
      })
      .filter((item): item is ReceiptItem => item !== null)

    if (draftItems.length === 0) {
      return null
    }

    return {
      invoiceNumber: lastPrintableReceipt?.invoiceNumber ?? 'Pending (save sale first)',
      saleDate: values.sale_date,
      customerName: selectedCustomerName || 'Walk-in Customer',
      customerPhone: selectedCustomerPhone || undefined,
      items: draftItems,
      total,
      paid: paidAmount,
      remaining: Math.max(total - paidAmount, 0),
    }
  }

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
              const customerId = Number.isFinite(selectedCustomerId) && selectedCustomerId > 0 ? selectedCustomerId : null

              const parsedItems = values.items
                .map((item, index) => {
                  const productId = toPositiveNumber(item.product_id)
                  const quantity = toPositiveQuantity(item.quantity)
                  const unitPrice = toNonNegativeNumberOrNull(item.unit_price)

                  if (!productId) {
                    form.setError(`items.${index}.product_id`, { message: 'Select product' })
                    return null
                  }

                  if (!quantity) {
                    form.setError(`items.${index}.quantity`, { message: 'Quantity must be at least 1' })
                    return null
                  }

                  if (unitPrice === null) {
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

              const payload: SaleCreatePayload = {
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
              }

              createMutation.mutate(payload)
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer</Label>
                <input type="hidden" {...form.register('customer_id')} />
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customer_id"
                      value={customerSearch}
                      onChange={(event) => {
                        setCustomerSearch(event.target.value)
                      }}
                      className="pl-9"
                      placeholder="Search customer by name or phone"
                    />
                  </div>

                  {customerSearch.trim().length > 0 ? (
                    <div className="max-h-44 overflow-y-auto rounded-md border bg-background">
                      {(customersQuery.data?.items ?? []).length > 0 ? (
                        (customersQuery.data?.items ?? []).map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              form.setValue('customer_id', String(customer.id), {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              })
                              setCustomerSearch(customer.name)
                              setSelectedCustomerName(customer.name)
                              setSelectedCustomerPhone(customer.phone ?? '')
                            }}
                          >
                            <span className="font-medium">{customer.name}</span>
                            {customer.phone ? <span className="ml-2 text-xs text-muted-foreground">{customer.phone}</span> : null}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No customers found.</p>
                      )}
                    </div>
                  ) : null}

                  {selectedCustomerName ? (
                    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                      <span>Selected: {selectedCustomerName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          form.setValue('customer_id', '', {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                          setSelectedCustomerName('')
                          setSelectedCustomerPhone('')
                          setCustomerSearch('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {form.formState.errors.customer_id?.message ? (
                  <p className="text-xs text-destructive">{form.formState.errors.customer_id.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">Customer is optional. Leave empty for walk-in sale.</p>
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
              <h3 className="text-sm font-medium">Items</h3>

              <div className="space-y-2">
                <Label>Search Product</Label>
                <ProductSearchSelect
                  value={productPickerValue}
                  onClear={() => setProductPickerValue('')}
                  onSelect={(product) => {
                    const productId = Number(product.id)
                    if (!Number.isFinite(productId) || productId <= 0) {
                      return
                    }

                    const alreadyAdded = form.getValues('items').some((item) => Number(item.product_id) === productId)
                    if (alreadyAdded) {
                      toast.info('Product already added.')
                      return
                    }

                    const salePrice = Number(product.sale_price ?? product.price ?? 0)
                    const purchasePrice = Number(product.purchase_price ?? product.cost_price ?? 0)
                    const availableQuantity = Number(product.stock_quantity ?? product.stock ?? 0)

                    append({
                      product_id: String(productId),
                      quantity: '1',
                      unit_price: String(Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : 0),
                    })

                    setProductNameById((previous) => ({
                      ...previous,
                      [productId]: buildProductDisplayName(product),
                    }))

                    setProductMetaById((previous) => ({
                      ...previous,
                      [productId]: {
                        name: buildProductDisplayName(product),
                        salePrice: Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : 0,
                        purchasePrice: Number.isFinite(purchasePrice) && purchasePrice >= 0 ? purchasePrice : 0,
                        availableQuantity: Number.isFinite(availableQuantity) ? availableQuantity : 0,
                      },
                    }))

                    setProductPickerValue('')
                  }}
                />
              </div>

              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Search and select a product to add item box.</p>
              ) : null}

              {fields.map((field, index) => {
                const currentProductId = Number(watchedItems[index]?.product_id ?? 0)
                const meta = Number.isFinite(currentProductId) ? productMetaById[currentProductId] : null
                const quantity = Number(watchedItems[index]?.quantity ?? 0)
                const unitPrice = Number(watchedItems[index]?.unit_price ?? 0)
                const lineTotal = Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0

                return (
                  <div key={field.id} className="space-y-3 rounded-md border p-3">
                    <input type="hidden" {...form.register(`items.${index}.product_id`)} />

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Product Name</Label>
                        <p className="text-sm font-semibold">
                          {meta?.name || productNameById[currentProductId] || `Product #${currentProductId}`}
                        </p>
                      </div>

                      <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Sale Price</Label>
                        <Input type="number" min="0" step="0.01" {...form.register(`items.${index}.unit_price`)} />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Wanted Qty</Label>
                        <Input type="number" min="1" step="0.01" {...form.register(`items.${index}.quantity`)} />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Available Qty</Label>
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
                          {meta?.availableQuantity ?? '-'}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Purchase Price</Label>
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
                          {meta ? meta.purchasePrice.toFixed(2) : '-'}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
                          {lineTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {form.formState.errors.items?.[index]?.product_id?.message ? (
                      <p className="text-xs text-destructive">{form.formState.errors.items[index]?.product_id?.message}</p>
                    ) : null}
                    {form.formState.errors.items?.[index]?.quantity?.message ? (
                      <p className="text-xs text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>
                    ) : null}
                    {form.formState.errors.items?.[index]?.unit_price?.message ? (
                      <p className="text-xs text-destructive">{form.formState.errors.items[index]?.unit_price?.message}</p>
                    ) : null}
                  </div>
                )
              })}
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
              <Button type="submit" disabled={createMutation.isPending || customersQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create Sale'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const values = form.getValues()
                  const receipt = lastPrintableReceipt ?? buildDraftReceipt(values)

                  if (!receipt) {
                    toast.error('Add at least one valid item before printing.')
                    return
                  }

                  printReceipt(receipt)
                }}
              >
                <Printer className="h-4 w-4" />
                Print Receipt
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

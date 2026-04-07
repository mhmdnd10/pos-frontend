import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, Search, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductSearchSelect } from '@/components/shared/forms/ProductSearchSelect'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { productService } from '@/features/products/services/productService'
import type { Product } from '@/features/products/types'
import { saleService } from '@/features/sales/services/saleService'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

interface ReturnLine {
  product_id: number
  product_name: string
  quantity: string
  unit_price: string
  sale_price: string
  purchase_price: string
  available_quantity: number
}

type ReturnMode = 'by-invoice' | 'without-invoice'

interface ReturnPrintSnapshot {
  lines: ReturnLine[]
  saleDate: string
  paidAmount: number
  total: number
  remaining: number
  mode: ReturnMode
  activeInvoice: string
}

function parseNumericValue(value?: string) {
  const normalizedValue = (value ?? '').trim().replace(',', '.')
  const parsed = Number(normalizedValue)
  return Number.isFinite(parsed) ? parsed : null
}

function toPositiveQuantity(value: string) {
  const parsed = parseNumericValue(value)
  return parsed !== null && parsed >= 1 ? parsed : null
}

function toNonNegativeNumber(value: string) {
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

function extractSaleItems(source: Record<string, unknown>): ReturnLine[] {
  const rawItems = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.saleItems)
      ? source.saleItems
      : Array.isArray(source.sale_items)
        ? source.sale_items
        : []

  return rawItems
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const productId = Number(item.product_id)
      const relationProduct = item.product
      const relationProductName =
        relationProduct && typeof relationProduct === 'object' && !Array.isArray(relationProduct)
          ? (relationProduct as Record<string, unknown>).name
          : null

      const productName =
        typeof relationProductName === 'string' && relationProductName.trim().length > 0
          ? relationProductName.trim()
          : Number.isFinite(productId)
            ? `Product #${productId}`
            : '-'

      return {
        product_id: Number.isFinite(productId) ? productId : 0,
        product_name: productName,
        quantity: String(item.quantity ?? ''),
        unit_price: String(item.unit_price ?? item.sale_price ?? ''),
        sale_price: String(item.unit_price ?? item.sale_price ?? ''),
        purchase_price: String(
          item.purchase_price ??
            (relationProduct && typeof relationProduct === 'object'
              ? (relationProduct as Record<string, unknown>).purchase_price
              : ''),
        ),
        available_quantity: Number(
          item.available_quantity ??
            (relationProduct && typeof relationProduct === 'object'
              ? (relationProduct as Record<string, unknown>).stock_quantity
              : 0),
        ),
      }
    })
}

async function enrichReturnLines(lines: ReturnLine[]) {
  const results = await Promise.all(
    lines.map(async (line) => {
      const productId = Number(line.product_id)
      if (!Number.isFinite(productId) || productId <= 0) {
        return line
      }

      try {
        const product = await productService.getById(productId)
        const salePrice = Number(product.sale_price ?? product.price ?? line.unit_price ?? 0)
        const purchasePrice = Number(product.purchase_price ?? product.cost_price ?? line.purchase_price ?? 0)
        const availableQuantity = Number(product.stock_quantity ?? product.stock ?? line.available_quantity ?? 0)

        return {
          ...line,
          product_name: product.name || line.product_name,
          unit_price: String(Number.isFinite(salePrice) ? salePrice : Number(line.unit_price || 0)),
          sale_price: String(Number.isFinite(salePrice) ? salePrice : Number(line.sale_price || line.unit_price || 0)),
          purchase_price: String(Number.isFinite(purchasePrice) ? purchasePrice : Number(line.purchase_price || 0)),
          available_quantity: Number.isFinite(availableQuantity) ? availableQuantity : Number(line.available_quantity || 0),
        }
      } catch {
        return line
      }
    }),
  )

  return results
}

export function ReturnSalePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [mode, setMode] = useState<ReturnMode>('by-invoice')
  const [invoiceInput, setInvoiceInput] = useState('')
  const [activeInvoice, setActiveInvoice] = useState('')
  const [loadedCustomerId, setLoadedCustomerId] = useState<number | null>(null)
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10))
  const [paidAmount, setPaidAmount] = useState('0')
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([])
  const [pickerValue, setPickerValue] = useState('')
  const [loadedPaidAmount, setLoadedPaidAmount] = useState(0)
  const shouldPrintAfterSaveRef = useRef(false)
  const printSnapshotRef = useRef<ReturnPrintSnapshot | null>(null)

  function resetInvoiceFlowState() {
    setInvoiceInput('')
    setActiveInvoice('')
    setLoadedCustomerId(null)
    setLoadedPaidAmount(0)
  }

  function resetSharedEditorState() {
    setReturnLines([])
    setPickerValue('')
    setPaidAmount('0')
    setSaleDate(new Date().toISOString().slice(0, 10))
  }

  function handleModeChange(nextMode: ReturnMode) {
    if (nextMode === mode) {
      return
    }

    if (nextMode === 'without-invoice') {
      resetInvoiceFlowState()
    }

    resetSharedEditorState()
    setMode(nextMode)
  }

  const total = useMemo(
    () =>
      returnLines.reduce((sum, line) => {
        const quantity = Number(line.quantity || 0)
        const unitPrice = Number(line.unit_price || 0)
        return sum + quantity * unitPrice
      }, 0),
    [returnLines],
  )

  const remaining = Math.max(total - Number(paidAmount || 0), 0)
  const loadedRemaining = Math.max(total - loadedPaidAmount, 0)

  const normalizedInvoiceInput = useMemo(() => {
    const raw = invoiceInput.trim().toUpperCase()
    if (!raw) {
      return ''
    }

    if (raw.startsWith('INV-')) {
      return raw
    }

    return `INV-${raw}`
  }, [invoiceInput])

  const loadByInvoiceMutation = useMutation({
    mutationFn: (invoiceNumber: string) => saleService.getByInvoice(invoiceNumber),
    onSuccess: async (response, invoiceNumber) => {
      const source = response as Record<string, unknown>
      setActiveInvoice(invoiceNumber)
      const customerId = Number(source.customer_id)
      setLoadedCustomerId(Number.isFinite(customerId) && customerId > 0 ? customerId : null)
      setSaleDate(String(source.sale_date ?? source.date ?? new Date().toISOString().slice(0, 10)))
      const paid = Number(source.paid_amount ?? 0)
      const normalizedPaid = Number.isFinite(paid) && paid >= 0 ? paid : 0
      setPaidAmount(String(normalizedPaid))
      setLoadedPaidAmount(normalizedPaid)
      const extracted = extractSaleItems(source)
      const enriched = await enrichReturnLines(extracted)
      setReturnLines(enriched)
      toast.success('Sale loaded by invoice.')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to load sale by invoice.')),
  })

  const updateByInvoiceMutation = useMutation({
    mutationFn: (payload: { invoiceNumber: string; body: Record<string, unknown> }) =>
      saleService.updateByInvoice(payload.invoiceNumber, payload.body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.sales.all })

      const source = response as Record<string, unknown>
      setSaleDate(String(source.sale_date ?? source.date ?? saleDate))
      const customerId = Number(source.customer_id)
      setLoadedCustomerId(Number.isFinite(customerId) && customerId > 0 ? customerId : loadedCustomerId)
      const paid = Number(source.paid_amount ?? paidAmount)
      const normalizedPaid = Number.isFinite(paid) && paid >= 0 ? paid : 0
      setPaidAmount(String(normalizedPaid))
      setLoadedPaidAmount(normalizedPaid)
      const extracted = extractSaleItems(source)
      const enriched = await enrichReturnLines(extracted)
      setReturnLines(enriched)
      toast.success('Sale invoice updated successfully.')

      if (shouldPrintAfterSaveRef.current) {
        const snapshot = printSnapshotRef.current
        handlePrintReturn(
          snapshot ?? {
            lines: enriched,
            saleDate: String(source.sale_date ?? source.date ?? saleDate),
            paidAmount: normalizedPaid,
            total: enriched.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0),
            remaining: Math.max(
              enriched.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0) - normalizedPaid,
              0,
            ),
            mode,
            activeInvoice,
          },
        )
      }
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      navigate(routePaths.sales)
    },
    onError: (error) => {
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      toast.error(getApiErrorMessage(error, 'Failed to update sale invoice.'))
    },
  })

  const quickReturnMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => saleService.quickReturn(payload),
    onSuccess: () => {
      if (shouldPrintAfterSaveRef.current) {
        handlePrintReturn(printSnapshotRef.current ?? undefined)
      }
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      setReturnLines([])
      toast.success('Quick return processed successfully.')
      navigate(routePaths.sales)
    },
    onError: (error) => {
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      toast.error(getApiErrorMessage(error, 'Failed to process quick return.'))
    },
  })

  function handlePrintReturn(snapshot?: ReturnPrintSnapshot) {
    const printable =
      snapshot ??
      ({
        lines: returnLines,
        saleDate,
        paidAmount: Number(paidAmount || 0),
        total,
        remaining,
        mode,
        activeInvoice,
      } as ReturnPrintSnapshot)

    if (printable.lines.length === 0) {
      toast.error('No return items to print.')
      return
    }

    const now = new Date()
    const lineWidth = 32
    const divider = '-'.repeat(lineWidth)

    const sanitizeText = (value: string) => value.trim()

    const formatMoney = (value: number) => value.toFixed(2)
    const formatKeyValue = (key: string, value: string) => `${key.padEnd(12)}: ${value}`

    const receiptDate = (() => {
      const [year, month, day] = printable.saleDate.split('-')
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

    const isWalkinReturn = printable.mode === 'without-invoice'
    const returnType = isWalkinReturn ? 'مرتجع' : 'مرتجع / تحديث فاتورة'

    const formatQuantity = (value: number) => {
      if (!Number.isFinite(value)) {
        return '0'
      }

      return Number.isInteger(value) ? String(value) : value.toFixed(2)
    }

    const itemRowsHtml = printable.lines
      .map((line) => {
        const qtyNumber = Number(line.quantity || 0)
        const priceNumber = Number(line.unit_price || 0)
        const lineTotalNumber = qtyNumber * priceNumber

        return `
          <tr>
            <td class="col-name">${escapeHtml(sanitizeText(line.product_name || '-'))}</td>
            <td class="col-qty">${escapeHtml(formatQuantity(qtyNumber))}</td>
            <td class="col-price">${escapeHtml(formatMoney(priceNumber))}</td>
            <td class="col-total">${escapeHtml(formatMoney(lineTotalNumber))}</td>
          </tr>
        `
      })
      .join('')

    const displayTotal = isWalkinReturn ? -printable.total : printable.total
    const displayPaid = isWalkinReturn ? -printable.paidAmount : printable.paidAmount
    const displayRemaining = isWalkinReturn ? -printable.remaining : printable.remaining

    let receiptLines = [
      'HOME DECORATION',
      'AL QMATIYEH',
      '03109497 | 03909497',
      divider,
      returnType,
    ]

    if (!isWalkinReturn && printable.activeInvoice) {
      receiptLines.push(formatKeyValue('Invoice', sanitizeText(printable.activeInvoice)))
    }

    receiptLines = [
      ...receiptLines,
      formatKeyValue('Date', receiptDate),
      formatKeyValue('Time', receiptTime),
      divider,
      formatKeyValue('Total Amount', formatMoney(displayTotal)),
      formatKeyValue('Paid Amount', formatMoney(displayPaid)),
      formatKeyValue('Remaining', formatMoney(displayRemaining)),
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

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Return Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 1.5mm; }
    html, body { margin: 0; padding: 0; color: #111; }
    body { font-family: Tahoma, Arial, 'Noto Naskh Arabic', 'Segoe UI', sans-serif; font-size: 14px; }
    .receipt {
      width: 78mm;
      margin: 0 auto;
      padding: 0.5mm 0.5mm 0 0.5mm;
      line-height: 1.35;
      white-space: pre;
      text-align: left;
      direction: ltr;
      unicode-bidi: plaintext;
    }
    .items {
      width: 100%;
      margin: 3px auto;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 13px;
    }
    .items th,
    .items td {
      border-bottom: 1px dashed #cbd5e1;
      padding: 2px 1px;
      vertical-align: top;
    }
    .items thead th {
      font-weight: 800;
      border-top: 1px dashed #cbd5e1;
      color: #0f172a;
    }
    .col-name {
      width: 56%;
      text-align: left;
      direction: rtl;
      unicode-bidi: plaintext;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .col-qty {
      width: 12%;
      text-align: left;
    }
    .col-price,
    .col-total {
      width: 16%;
      text-align: left;
      font-weight: 700;
    }
    .header-line {
      color: #111827;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <pre class="receipt header-line">${receiptLines.slice(0, !isWalkinReturn && printable.activeInvoice ? 9 : 8).join('\r\n')}</pre>
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
  <pre class="receipt">${receiptLines.slice(!isWalkinReturn && printable.activeInvoice ? 9 : 8).join('\r\n')}</pre>
</body>
</html>`

    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) {
      toast.error('Please allow popups to print.')
      return
    }

    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  function addProductLine(product: Product) {
    const productId = Number(product.id)
    if (!Number.isFinite(productId) || productId <= 0) {
      return
    }

    const alreadyAdded = returnLines.some((line) => Number(line.product_id) === productId)
    if (alreadyAdded) {
      toast.info('Product already added.')
      return
    }

    const salePrice = Number(product.sale_price ?? product.price ?? 0)
    const purchasePrice = Number(product.purchase_price ?? product.cost_price ?? 0)
    const availableQuantity = Number(product.stock_quantity ?? product.stock ?? 0)

    setReturnLines((previous) => [
      ...previous,
      {
        product_id: productId,
        product_name: product.name || `Product #${productId}`,
        quantity: '1',
        unit_price: String(Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : 0),
        sale_price: String(Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : 0),
        purchase_price: String(Number.isFinite(purchasePrice) && purchasePrice >= 0 ? purchasePrice : 0),
        available_quantity: Number.isFinite(availableQuantity) ? availableQuantity : 0,
      },
    ])
    setPickerValue('')
  }

  function handleDeleteLine(index: number) {
    setReturnLines((previous) => previous.filter((_, i) => i !== index))
  }

  function handleUpdateLineQuantity(index: number, newQuantity: string) {
    setReturnLines((previous) =>
      previous.map((line, i) => (i === index ? { ...line, quantity: newQuantity } : line)),
    )
  }

  function handleUpdateLinePrice(index: number, newPrice: string) {
    setReturnLines((previous) =>
      previous.map((line, i) => (i === index ? { ...line, unit_price: newPrice, sale_price: newPrice } : line)),
    )
  }

  function handleSaveReturn(printAfterSave = false) {
    shouldPrintAfterSaveRef.current = printAfterSave

    if (mode === 'by-invoice' && !activeInvoice) {
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      toast.error('Load invoice first.')
      return
    }

    if (!saleDate.trim()) {
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      toast.error('Sale date is required.')
      return
    }

    const parsedPaidAmount = toNonNegativeNumber(paidAmount)
    if (parsedPaidAmount === null) {
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      toast.error('Paid amount must be a non-negative number.')
      return
    }

    const parsedItems = returnLines
      .map((line) => {
        const productId = Number(line.product_id)
        const quantity = toPositiveQuantity(line.quantity)
        const unitPrice = toNonNegativeNumber(line.unit_price)

        if (!Number.isFinite(productId) || productId <= 0 || !quantity || unitPrice === null) {
          return null
        }

        return {
          product_id: productId,
          quantity,
          unit_price: unitPrice,
        }
      })
      .filter(
        (item): item is { product_id: number; quantity: number; unit_price: number } => item !== null,
      )

    if (parsedItems.length !== returnLines.length || parsedItems.length === 0) {
      shouldPrintAfterSaveRef.current = false
      printSnapshotRef.current = null
      toast.error('Please provide valid products, quantities, and prices.')
      return
    }

    if (printAfterSave) {
      printSnapshotRef.current = {
        lines: returnLines,
        saleDate,
        paidAmount: parsedPaidAmount,
        total,
        remaining: Math.max(total - parsedPaidAmount, 0),
        mode,
        activeInvoice,
      }
    } else {
      printSnapshotRef.current = null
    }

    if (mode === 'by-invoice') {
      updateByInvoiceMutation.mutate({
        invoiceNumber: activeInvoice,
        body: {
          customer_id: loadedCustomerId,
          total_amount: total,
          sale_date: saleDate,
          paid_amount: parsedPaidAmount,
          items: parsedItems,
        },
      })
    } else {
      const quickReturnItems = returnLines.map((line) => ({
        product_id: Number(line.product_id),
        quantity: Number(line.quantity),
        unit_price: Number(line.sale_price || line.unit_price),
      }))

      quickReturnMutation.mutate({
        customer_id: null,
        total_amount: total,
        paid_amount: parsedPaidAmount,
        items: quickReturnItems,
      })
    }
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Return Sale / Update Invoice"
        description="Manage returns by invoice number or create new return without invoice."
      />

      <div className="mb-4 flex gap-2 rounded-lg border bg-muted/30 p-2">
        <Button
          variant={mode === 'by-invoice' ? 'default' : 'outline'}
          onClick={() => handleModeChange('by-invoice')}
        >
          Return By Invoice
        </Button>
        <Button
          variant={mode === 'without-invoice' ? 'default' : 'outline'}
          onClick={() => handleModeChange('without-invoice')}
        >
          Return Without Invoice
        </Button>
      </div>

      {mode === 'by-invoice' ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Search Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_input">Invoice Number</Label>
              <div className="flex gap-2">
                <div className="flex w-full items-center rounded-md border bg-background">
                  <span className="border-r px-3 text-sm text-muted-foreground">INV-</span>
                  <Input
                    id="invoice_input"
                    value={invoiceInput}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/[^0-9]/g, '')
                      setInvoiceInput(digitsOnly)
                    }}
                    placeholder="000001"
                    className="border-0 focus-visible:ring-0"
                  />
                </div>
                <Button
                  type="button"
                  disabled={loadByInvoiceMutation.isPending}
                  onClick={() => {
                    const trimmed = normalizedInvoiceInput.trim()
                    if (!trimmed) {
                      toast.error('Enter invoice number.')
                      return
                    }

                    loadByInvoiceMutation.mutate(trimmed)
                  }}
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>

            {activeInvoice ? (
              <div className="space-y-3 rounded-md border bg-green-50 p-3 text-sm dark:bg-green-950">
                <p>
                  <strong>✓ Loaded:</strong> {activeInvoice}
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold">{total.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-semibold">{loadedPaidAmount.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border bg-background/70 p-2">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="font-semibold">{loadedRemaining.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Add Product By Search</Label>
              <ProductSearchSelect
                value={pickerValue}
                onClear={() => setPickerValue('')}
                onSelect={(product) => addProductLine(product)}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Quick Return (Without Invoice)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Search Product</Label>
              <ProductSearchSelect
                value={pickerValue}
                onClear={() => setPickerValue('')}
                onSelect={(product) => addProductLine(product)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {returnLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mode === 'by-invoice'
                ? 'Search invoice to load items.'
                : 'Add products to start return without invoice.'}
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {returnLines.map((line, index) => (
                  <div key={`${line.product_id}-${index}`} className="space-y-3 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Product Name</Label>
                        <p className="text-sm font-semibold">{line.product_name}</p>
                      </div>
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteLine(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      <div className="space-y-1">
                        <Label htmlFor={`price-${index}`} className="text-xs text-muted-foreground">
                          Sale Price
                        </Label>
                        <Input
                          id={`price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(event) => handleUpdateLinePrice(index, event.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`quantity-${index}`} className="text-xs text-muted-foreground">
                          Wanted Qty
                        </Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          step="0.01"
                          value={line.quantity}
                          onChange={(event) => handleUpdateLineQuantity(index, event.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Available Qty</Label>
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
                          {line.available_quantity}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Purchase Price</Label>
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
                          {Number(line.purchase_price || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
                          {(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="sale_date">Sale Date</Label>
                    <Input
                      id="sale_date"
                      type="date"
                      value={saleDate}
                      onChange={(event) => setSaleDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paid_amount">Paid Amount</Label>
                    <Input
                      id="paid_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paidAmount}
                      onChange={(event) => setPaidAmount(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Remaining</Label>
                    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold text-primary">
                      {remaining.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold">{total.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Item Count</p>
                    <p className="text-xl font-bold">{returnLines.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handlePrintReturn()}
                  disabled={returnLines.length === 0}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={updateByInvoiceMutation.isPending || quickReturnMutation.isPending}
                  onClick={() => handleSaveReturn(false)}
                >
                  {updateByInvoiceMutation.isPending || quickReturnMutation.isPending
                    ? 'Saving...'
                    : mode === 'by-invoice'
                      ? 'Save Return / Update Invoice'
                      : 'Process Quick Return'}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={updateByInvoiceMutation.isPending || quickReturnMutation.isPending}
                  onClick={() => handleSaveReturn(true)}
                >
                  <Printer className="h-4 w-4" />
                  Save & Print
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { RecordDetails } from '@/components/shared/details/RecordDetails'
import { PageHeader } from '@/components/shared/PageHeader'
import { customerService } from '@/features/customers/services/customerService'
import { productService } from '@/features/products/services/productService'
import { buildProductDisplayName } from '@/features/products/utils/productDisplay'
import { saleService } from '@/features/sales/services/saleService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function SaleDetailsPage() {
  const { id } = useParams()
  const saleId = Number(id)

  const detailQuery = useQuery({
    queryKey: queryKeys.sales.byId(saleId),
    queryFn: () => saleService.getById(saleId),
    enabled: Number.isFinite(saleId),
  })

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers.all, 'sale-details-customer-lookup'],
    queryFn: () => customerService.list(1),
  })

  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.all, 'sale-details-product-lookup'],
    queryFn: () => productService.list(1),
  })

  const customersById = new Map((customersQuery.data?.items ?? []).map((customer) => [customer.id, customer.name]))
  const productsById = new Map((productsQuery.data?.items ?? []).map((product) => [product.id, buildProductDisplayName(product)]))

  function resolveInvoiceNumber(source: Record<string, unknown>) {
    const invoiceCandidate = source.invoice_number
    if (typeof invoiceCandidate === 'string' && invoiceCandidate.trim().length > 0) {
      return invoiceCandidate
    }

    const id = Number(source.id)
    return Number.isFinite(id) && id > 0 ? `INV-${String(id).padStart(6, '0')}` : '-'
  }

  return (
    <div>
      <PageHeader title="Sale Details" description="Details from /api/sales/{id}" />
      {detailQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading details...</div> : null}
      {detailQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load details.</div> : null}
      {detailQuery.data ? (
        (() => {
          const source = detailQuery.data as Record<string, unknown>
          const customerId = Number(source.customer_id)
          const mappedCustomerName = Number.isFinite(customerId) ? customersById.get(customerId) : null
          const rawItems = Array.isArray(source.items)
            ? source.items
            : Array.isArray(source.saleItems)
              ? source.saleItems
              : Array.isArray(source.sale_items)
                ? source.sale_items
              : []

          const normalizedItems = rawItems
            .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            .map((item) => {
              const productId = Number(item.product_id)
              const relationProduct = item.product
              const relationProductLabel =
                relationProduct && typeof relationProduct === 'object' && !Array.isArray(relationProduct)
                  ? buildProductDisplayName({
                      id: productId,
                      name: (relationProduct as Record<string, unknown>).name as string | null | undefined,
                      brand: (relationProduct as Record<string, unknown>).brand as string | null | undefined,
                      color: (relationProduct as Record<string, unknown>).color as string | null | undefined,
                    })
                  : ''

              return {
                product:
                  relationProductLabel.trim().length > 0
                    ? relationProductLabel
                    : Number.isFinite(productId)
                      ? productsById.get(productId) ?? `Product #${productId}`
                      : '-',
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
              }
            })

          return (
        <RecordDetails
          title="Sale"
          data={{
            ...source,
            invoice_number: resolveInvoiceNumber(source),
            items: normalizedItems,
            customer: mappedCustomerName ?? getPartyDisplayName(source, {
              prefix: 'customer',
              idKey: 'customer_id',
              fallbackLabel: 'Customer',
              allowIdFallback: false,
            }),
            sale_date: formatDisplayDate(source.sale_date ?? source.date),
            payment_method: typeof source.payment_method === 'string' && source.payment_method.trim().length > 0
              ? source.payment_method
              : '-',
            total: formatDisplayAmount(source.total ?? source.total_amount),
            paid_amount: formatDisplayAmount(source.paid_amount),
            due_amount: formatDisplayAmount(source.due_amount ?? source.remaining_amount),
          }}
          summaryKeys={['invoice_number', 'customer', 'sale_date', 'payment_method', 'total']}
          preferredDetailKeys={['invoice_number', 'customer', 'sale_date', 'payment_method', 'total', 'paid_amount', 'due_amount', 'note', 'created_at', 'updated_at']}
        />
          )
        })()
      ) : null}
    </div>
  )
}

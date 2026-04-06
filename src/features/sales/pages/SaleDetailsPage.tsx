import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
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

  const rawItems = useMemo(() => {
    const source = (detailQuery.data ?? {}) as Record<string, unknown>

    if (Array.isArray(source.items)) {
      return source.items
    }

    if (Array.isArray(source.saleItems)) {
      return source.saleItems
    }

    if (Array.isArray(source.sale_items)) {
      return source.sale_items
    }

    return []
  }, [detailQuery.data])

  const itemProductIds = useMemo(() => {
    const ids = rawItems
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => Number(item.product_id))
      .filter((productId) => Number.isFinite(productId) && productId > 0)

    return Array.from(new Set(ids))
  }, [rawItems])

  const itemProductsQuery = useQuery({
    queryKey: [...queryKeys.products.all, 'sale-details-product-by-id', itemProductIds.join(',')],
    enabled: itemProductIds.length > 0,
    queryFn: async () => {
      const result: Record<number, string> = {}
      const responses = await Promise.allSettled(itemProductIds.map((productId) => productService.getById(productId)))

      responses.forEach((response, index) => {
        if (response.status !== 'fulfilled') {
          return
        }

        const productId = itemProductIds[index]
        result[productId] = buildProductDisplayName(response.value)
      })

      return result
    },
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
          const productNamesById = itemProductsQuery.data ?? {}

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
                      size: (relationProduct as Record<string, unknown>).size as string | null | undefined,
                    })
                  : ''

              const rawProductName =
                typeof item.product_name === 'string' && item.product_name.trim().length > 0
                  ? item.product_name.trim()
                  : typeof item.name === 'string' && item.name.trim().length > 0
                    ? item.name.trim()
                    : ''

              return {
                product:
                  relationProductLabel.trim().length > 0
                    ? relationProductLabel
                    : rawProductName.length > 0
                      ? rawProductName
                    : Number.isFinite(productId)
                      ? productNamesById[productId] ?? productsById.get(productId) ?? `Product #${productId}`
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

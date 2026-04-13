import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { RecordDetails } from '@/components/shared/details/RecordDetails'
import { PageHeader } from '@/components/shared/PageHeader'
import { productService } from '@/features/products/services/productService'
import { buildProductDisplayName } from '@/features/products/utils/productDisplay'
import { purchaseService } from '@/features/purchases/services/purchaseService'
import { supplierService } from '@/features/suppliers/services/supplierService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function PurchaseDetailsPage() {
  const { id } = useParams()
  const purchaseId = Number(id)

  const detailQuery = useQuery({
    queryKey: queryKeys.purchases.byId(purchaseId),
    queryFn: () => purchaseService.getById(purchaseId),
    enabled: Number.isFinite(purchaseId),
  })

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers.all, 'purchase-details-supplier-lookup'],
    queryFn: () => supplierService.list(1),
  })

  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.all, 'purchase-details-product-lookup'],
    queryFn: () => productService.list(1),
  })

  const rawItems = useMemo(() => {
    const source = (detailQuery.data ?? {}) as Record<string, unknown>

    if (Array.isArray(source.items)) {
      return source.items
    }

    if (Array.isArray(source.purchaseItems)) {
      return source.purchaseItems
    }

    if (Array.isArray(source.purchase_items)) {
      return source.purchase_items
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
    queryKey: [...queryKeys.products.all, 'purchase-details-product-by-id', itemProductIds.join(',')],
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

  const suppliersById = new Map((suppliersQuery.data?.items ?? []).map((supplier) => [supplier.id, supplier.name]))
  const productsById = new Map((productsQuery.data?.items ?? []).map((product) => [product.id, buildProductDisplayName(product)]))

  return (
    <div>
      <PageHeader title="Purchase Details" description="Details from /api/purchases/{id}" />
      {detailQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading details...</div> : null}
      {detailQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load details.</div> : null}
      {detailQuery.data ? (
        (() => {
          const source = detailQuery.data as Record<string, unknown>
          const supplierId = Number(source.supplier_id)
          const mappedSupplierName = Number.isFinite(supplierId) ? suppliersById.get(supplierId) : null
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
                      model: (relationProduct as Record<string, unknown>).model as string | null | undefined,
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
          title="Purchase"
          data={{
            ...source,
            items: normalizedItems,
            supplier: mappedSupplierName ?? getPartyDisplayName(source, {
              prefix: 'supplier',
              idKey: 'supplier_id',
              fallbackLabel: 'Supplier',
              allowIdFallback: false,
            }),
            purchase_date: formatDisplayDate(source.purchase_date ?? source.date),
            total: formatDisplayAmount(source.total ?? source.total_amount),
            paid_amount: formatDisplayAmount(source.paid_amount),
            remaining_amount: formatDisplayAmount(source.remaining_amount),
          }}
          summaryKeys={['supplier', 'purchase_date', 'total']}
          preferredDetailKeys={['supplier', 'purchase_date', 'total', 'paid_amount', 'remaining_amount', 'discount', 'tax', 'note', 'created_at', 'updated_at']}
        />
          )
        })()
      ) : null}
    </div>
  )
}

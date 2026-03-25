import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { RecordDetails } from '@/components/shared/details/RecordDetails'
import { PageHeader } from '@/components/shared/PageHeader'
import { supplierPaymentService } from '@/features/supplier-payments/services/supplierPaymentService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function SupplierPaymentDetailsPage() {
  const { id } = useParams()
  const paymentId = Number(id)

  const detailQuery = useQuery({
    queryKey: queryKeys.supplierPayments.byId(paymentId),
    queryFn: () => supplierPaymentService.getById(paymentId),
    enabled: Number.isFinite(paymentId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const source = (detailQuery.data ?? {}) as Record<string, unknown>
  const relationSupplier = source.supplier
  const relationSupplierName =
    relationSupplier && typeof relationSupplier === 'object' && !Array.isArray(relationSupplier)
      ? (relationSupplier as Record<string, unknown>).name
      : null

  return (
    <div>
      <PageHeader title="Supplier Payment Details" description="Details from /api/supplier-payments/{id}" />
      {detailQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading details...</div> : null}
      {detailQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load details.</div> : null}
      {detailQuery.data ? (
        <RecordDetails
          title="Supplier Payment"
          data={{
            ...source,
            supplier: typeof relationSupplierName === 'string' && relationSupplierName.trim().length > 0
              ? relationSupplierName.trim()
              : getPartyDisplayName(source, {
              prefix: 'supplier',
              idKey: 'supplier_id',
              fallbackLabel: 'Supplier',
            }),
            amount: formatDisplayAmount(source.amount),
            paid_at: formatDisplayDate(source.paid_at ?? source.payment_date),
          }}
          summaryKeys={['supplier', 'amount', 'paid_at', 'payment_method']}
          preferredDetailKeys={['supplier', 'amount', 'payment_method', 'reference', 'paid_at', 'note', 'created_at', 'updated_at']}
        />
      ) : null}
    </div>
  )
}

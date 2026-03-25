import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { RecordDetails } from '@/components/shared/details/RecordDetails'
import { PageHeader } from '@/components/shared/PageHeader'
import { customerPaymentService } from '@/features/customer-payments/services/customerPaymentService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function CustomerPaymentDetailsPage() {
  const { id } = useParams()
  const paymentId = Number(id)

  const detailQuery = useQuery({
    queryKey: queryKeys.customerPayments.byId(paymentId),
    queryFn: () => customerPaymentService.getById(paymentId),
    enabled: Number.isFinite(paymentId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const source = (detailQuery.data ?? {}) as Record<string, unknown>
  const relationCustomer = source.customer
  const relationCustomerName =
    relationCustomer && typeof relationCustomer === 'object' && !Array.isArray(relationCustomer)
      ? (relationCustomer as Record<string, unknown>).name
      : null

  return (
    <div>
      <PageHeader title="Customer Payment Details" description="Details from /api/customer-payments/{id}" />
      {detailQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading details...</div> : null}
      {detailQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load details.</div> : null}
      {detailQuery.data ? (
        <RecordDetails
          title="Customer Payment"
          data={{
            ...source,
            customer: typeof relationCustomerName === 'string' && relationCustomerName.trim().length > 0
              ? relationCustomerName.trim()
              : getPartyDisplayName(source, {
              prefix: 'customer',
              idKey: 'customer_id',
              fallbackLabel: 'Customer',
            }),
            amount: formatDisplayAmount(source.amount),
            paid_at: formatDisplayDate(source.paid_at ?? source.payment_date),
          }}
          summaryKeys={['customer', 'amount', 'paid_at', 'payment_method']}
          preferredDetailKeys={['customer', 'amount', 'payment_method', 'reference', 'paid_at', 'note', 'created_at', 'updated_at']}
        />
      ) : null}
    </div>
  )
}

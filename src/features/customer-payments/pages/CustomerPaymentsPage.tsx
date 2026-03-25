import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { Button } from '@/components/shared/ui/button'
import { customerPaymentService } from '@/features/customer-payments/services/customerPaymentService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function CustomerPaymentsPage() {
  const [page, setPage] = useState(1)
  const paymentsQuery = useQuery({
    queryKey: [...queryKeys.customerPayments.all, page],
    queryFn: () => customerPaymentService.list(page),
  })

  return (
    <div>
      <PageHeader
        title="Customer Payments"
        description="Payment records from /api/customer-payments"
        actions={
          <Button asChild>
            <Link to="/customer-payments/new">
              <Plus className="h-4 w-4" />
              New Payment
            </Link>
          </Button>
        }
      />

      {paymentsQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading customer payments...</div> : null}
      {paymentsQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load customer payments.</div> : null}

      {paymentsQuery.data ? (
        <>
          <DataTable
            columns={[
              {
                key: 'customer_id',
                header: 'Customer',
                render: (row) => getPartyDisplayName(row as Record<string, unknown>, { prefix: 'customer', idKey: 'customer_id', fallbackLabel: 'Customer' }),
              },
              { key: 'amount', header: 'Amount', render: (row) => formatDisplayAmount((row as Record<string, unknown>).amount) },
              {
                key: 'paid_at',
                header: 'Paid At',
                render: (row) => formatDisplayDate((row as Record<string, unknown>).paid_at ?? (row as Record<string, unknown>).payment_date),
              },
              { key: 'payment_method', header: 'Method' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/customer-payments/${row.id}`}>Details</Link>
                  </Button>
                ),
              },
            ]}
            rows={paymentsQuery.data.items}
            getRowId={(row) => String(row.id)}
            emptyMessage="No customer payments found."
          />
          <PaginationControls meta={paymentsQuery.data.meta} onPageChange={setPage} isLoading={paymentsQuery.isFetching} />
        </>
      ) : null}
    </div>
  )
}

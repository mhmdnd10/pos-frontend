import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { Button } from '@/components/shared/ui/button'
import { supplierPaymentService } from '@/features/supplier-payments/services/supplierPaymentService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function SupplierPaymentsPage() {
  const [page, setPage] = useState(1)
  const paymentsQuery = useQuery({
    queryKey: [...queryKeys.supplierPayments.all, page],
    queryFn: () => supplierPaymentService.list(page),
  })

  return (
    <div>
      <PageHeader
        title="Supplier Payments"
        description="Payment records from /api/supplier-payments"
        actions={
          <Button asChild>
            <Link to="/supplier-payments/new">
              <Plus className="h-4 w-4" />
              New Payment
            </Link>
          </Button>
        }
      />

      {paymentsQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading supplier payments...</div> : null}
      {paymentsQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load supplier payments.</div> : null}

      {paymentsQuery.data ? (
        <>
          <DataTable
            columns={[
              {
                key: 'supplier_id',
                header: 'Supplier',
                render: (row) => getPartyDisplayName(row as Record<string, unknown>, { prefix: 'supplier', idKey: 'supplier_id', fallbackLabel: 'Supplier' }),
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
                    <Link to={`/supplier-payments/${row.id}`}>Details</Link>
                  </Button>
                ),
              },
            ]}
            rows={paymentsQuery.data.items}
            getRowId={(row) => String(row.id)}
            emptyMessage="No supplier payments found."
          />
          <PaginationControls meta={paymentsQuery.data.meta} onPageChange={setPage} isLoading={paymentsQuery.isFetching} />
        </>
      ) : null}
    </div>
  )
}

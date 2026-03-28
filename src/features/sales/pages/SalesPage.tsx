import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { routePaths } from '@/app/router/routePaths'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { Button } from '@/components/shared/ui/button'
import { customerService } from '@/features/customers/services/customerService'
import { saleService } from '@/features/sales/services/saleService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function SalesPage() {
  const [page, setPage] = useState(1)
  const salesQuery = useQuery({
    queryKey: [...queryKeys.sales.all, page],
    queryFn: () => saleService.list(page),
  })

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers.all, 'sales-customer-lookup'],
    queryFn: () => customerService.list(1),
  })

  const customersById = new Map((customersQuery.data?.items ?? []).map((customer) => [customer.id, customer.name]))

  function resolveInvoiceNumber(row: Record<string, unknown>) {
    const invoiceCandidate = row.invoice_number
    if (typeof invoiceCandidate === 'string' && invoiceCandidate.trim().length > 0) {
      return invoiceCandidate
    }

    const id = Number(row.id)
    return Number.isFinite(id) && id > 0 ? `INV-${String(id).padStart(6, '0')}` : '-'
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Sales records from /api/sales"
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={() => window.open(routePaths.salesNew, '_blank', 'noopener,noreferrer')}>
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
            <Button asChild variant="outline">
              <Link to={routePaths.salesReturns}>Return Sale</Link>
            </Button>
          </div>
        }
      />

      {salesQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading sales...</div> : null}
      {salesQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load sales.</div> : null}

      {salesQuery.data ? (
        <>
          <DataTable
            columns={[
              {
                key: 'customer_id',
                header: 'Customer',
                render: (row) => {
                  const customerId = Number((row as Record<string, unknown>).customer_id)
                  const mappedName = Number.isFinite(customerId) ? customersById.get(customerId) : null
                  if (mappedName) {
                    return mappedName
                  }

                  return getPartyDisplayName(row as Record<string, unknown>, {
                    prefix: 'customer',
                    idKey: 'customer_id',
                    fallbackLabel: 'Customer',
                    allowIdFallback: false,
                  })
                },
              },
              {
                key: 'sale_date',
                header: 'Date',
                render: (row) => formatDisplayDate((row as Record<string, unknown>).sale_date ?? (row as Record<string, unknown>).date),
              },
              {
                key: 'invoice_number',
                header: 'Invoice',
                render: (row) => resolveInvoiceNumber(row as Record<string, unknown>),
              },
              {
                key: 'payment_method',
                header: 'Payment Type',
                render: (row) => String((row as Record<string, unknown>).payment_method ?? '-'),
              },
              {
                key: 'total_amount',
                header: 'Total',
                render: (row) => formatDisplayAmount((row as Record<string, unknown>).total_amount ?? (row as Record<string, unknown>).total),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/sales/${row.id}`}>Details</Link>
                  </Button>
                ),
              },
            ]}
            rows={salesQuery.data.items}
            getRowId={(row) => String(row.id)}
            emptyMessage="No sales found."
          />
          <PaginationControls meta={salesQuery.data.meta} onPageChange={setPage} isLoading={salesQuery.isFetching} />
        </>
      ) : null}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { routePaths } from '@/app/router/routePaths'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { Button } from '@/components/shared/ui/button'
import { purchaseService } from '@/features/purchases/services/purchaseService'
import { supplierService } from '@/features/suppliers/services/supplierService'
import { queryKeys } from '@/lib/constants/queryKeys'
import { formatDisplayAmount, formatDisplayDate, getPartyDisplayName } from '@/lib/utils/recordDisplay'

export function PurchasesPage() {
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const purchasesQuery = useQuery({
    queryKey: [...queryKeys.purchases.all, page, fromDate, toDate],
    queryFn: () =>
      purchaseService.list(page, {
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  })

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers.all, 'purchases-supplier-lookup'],
    queryFn: () => supplierService.list(1),
  })

  const suppliersById = new Map((suppliersQuery.data?.items ?? []).map((supplier) => [supplier.id, supplier.name]))

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Purchase records from /api/purchases"
        actions={
          <Button type="button" onClick={() => window.open(routePaths.purchasesNew, '_blank', 'noopener,noreferrer')}>
              <Plus className="h-4 w-4" />
              New Purchase
          </Button>
        }
      />

      {purchasesQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading purchases...</div> : null}
      {purchasesQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load purchases.</div> : null}

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="purchases_from_date">From</label>
          <input
            id="purchases_from_date"
            type="date"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="purchases_to_date">To</label>
          <input
            id="purchases_to_date"
            type="date"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setFromDate('')
              setToDate('')
              setPage(1)
            }}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {purchasesQuery.data ? (
        <>
          <DataTable
            columns={[
              {
                key: 'supplier_id',
                header: 'Supplier',
                render: (row) => {
                  const supplierId = Number((row as Record<string, unknown>).supplier_id)
                  const mappedName = Number.isFinite(supplierId) ? suppliersById.get(supplierId) : null
                  if (mappedName) {
                    return mappedName
                  }

                  return getPartyDisplayName(row as Record<string, unknown>, {
                    prefix: 'supplier',
                    idKey: 'supplier_id',
                    fallbackLabel: 'Supplier',
                    allowIdFallback: false,
                  })
                },
              },
              {
                key: 'purchase_date',
                header: 'Date',
                render: (row) => formatDisplayDate((row as Record<string, unknown>).purchase_date ?? (row as Record<string, unknown>).date),
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
                    <Link to={`/purchases/${row.id}`}>Details</Link>
                  </Button>
                ),
              },
            ]}
            rows={purchasesQuery.data.items}
            getRowId={(row) => String(row.id)}
            emptyMessage="No purchases found."
          />
          <PaginationControls meta={purchasesQuery.data.meta} onPageChange={setPage} isLoading={purchasesQuery.isFetching} />
        </>
      ) : null}
    </div>
  )
}

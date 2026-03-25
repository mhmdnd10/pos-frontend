import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { DataTable } from '@/components/shared/DataTable'
import { JsonCard } from '@/components/shared/json/JsonCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { supplierService } from '@/features/suppliers/services/supplierService'
import { queryKeys } from '@/lib/constants/queryKeys'

export function SupplierLedgerPage() {
  const { id } = useParams()
  const supplierId = Number(id)
  const [page, setPage] = useState(1)

  const ledgerQuery = useQuery({
    queryKey: [...queryKeys.suppliers.ledger(supplierId), page],
    queryFn: () => supplierService.ledger(supplierId, page),
    enabled: Number.isFinite(supplierId),
  })

  return (
    <div>
      <PageHeader title={`Supplier Ledger #${supplierId}`} description="Transaction ledger from /api/suppliers/{id}/ledger" />

      {ledgerQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading ledger...</div> : null}
      {ledgerQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load ledger.</div> : null}

      {ledgerQuery.data ? (
        ledgerQuery.data.items.length > 0 ? (
          <>
            <DataTable
              columns={Object.keys(ledgerQuery.data.items[0] ?? {}).slice(0, 8).map((key) => ({ key, header: key }))}
              rows={ledgerQuery.data.items}
              getRowId={(row, index) => String((row.id as number | undefined) ?? index)}
              emptyMessage="No ledger records found."
            />
            <PaginationControls meta={ledgerQuery.data.meta} onPageChange={setPage} isLoading={ledgerQuery.isFetching} />
          </>
        ) : (
          <JsonCard title="Ledger Response" value={ledgerQuery.data.items} />
        )
      ) : null}
    </div>
  )
}

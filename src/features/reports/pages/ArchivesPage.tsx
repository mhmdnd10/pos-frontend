import { useMutation } from '@tanstack/react-query'
import { ArchiveRestore, CalendarDays, Database, Layers, Table2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { archiveService } from '@/features/reports/services/archiveService'
import { buildProductDisplayName } from '@/features/products/utils/productDisplay'
import type { ArchiveDatasetKey, ArchiveMonthlyResult, ArchiveRow } from '@/features/reports/types'
import { httpClient } from '@/lib/api/httpClient'
import { getApiErrorMessage, normalizeItemResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'

const datasetMeta: Array<{ key: ArchiveDatasetKey; label: string; colorClass: string }> = [
  { key: 'sales', label: 'Sales', colorClass: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
  { key: 'sale_items', label: 'Sale Items', colorClass: 'bg-sky-100 text-sky-900 border-sky-200' },
  { key: 'customer_payments', label: 'Customer Payments', colorClass: 'bg-teal-100 text-teal-900 border-teal-200' },
  { key: 'customer_ledgers', label: 'Customer Ledgers', colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { key: 'purchases', label: 'Purchases', colorClass: 'bg-amber-100 text-amber-900 border-amber-200' },
  { key: 'purchase_items', label: 'Purchase Items', colorClass: 'bg-orange-100 text-orange-900 border-orange-200' },
  { key: 'supplier_payments', label: 'Supplier Payments', colorClass: 'bg-rose-100 text-rose-900 border-rose-200' },
  { key: 'supplier_ledgers', label: 'Supplier Ledgers', colorClass: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200' },
]

const prioritizedColumns = [
  'id',
  'sale_date',
  'purchase_date',
  'sale_id',
  'purchase_id',
  'customer_id',
  'supplier_id',
  'amount',
  'total_amount',
  'grand_total',
  'status',
  'payment_method',
  'reference_id',
  'archived_at',
]

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7)
}

function toTitleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getRowId(row: ArchiveRow, index: number) {
  const value = row.id
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  return `${index}`
}

type NameLookups = {
  products: Record<number, string>
  customers: Record<number, string>
  suppliers: Record<number, string>
  shops: Record<number, string>
}

function createColumns(rows: ArchiveRow[], lookups: NameLookups): DataTableColumn<ArchiveRow>[] {
  if (rows.length === 0) {
    return []
  }

  const rowKeys = new Set<string>()

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      rowKeys.add(key)
    }
  }

  const available = Array.from(rowKeys)
  const prioritized = prioritizedColumns.filter((key) => rowKeys.has(key))
  const remaining = available.filter((key) => !prioritized.includes(key)).sort((a, b) => a.localeCompare(b))
  const selected = [...prioritized, ...remaining].slice(0, 10)

  return selected.map((key) => ({
    key,
    header: toTitleCase(key),
    render: (row) => {
      const value = row[key]

      if (key === 'product_id') {
        const id = Number(value)
        if (Number.isFinite(id) && id > 0) {
          return lookups.products[id] ? `${lookups.products[id]} (#${id})` : `Product #${id}`
        }
      }

      if (key === 'customer_id') {
        const id = Number(value)
        if (Number.isFinite(id) && id > 0) {
          return lookups.customers[id] ? `${lookups.customers[id]} (#${id})` : `Customer #${id}`
        }
      }

      if (key === 'supplier_id') {
        const id = Number(value)
        if (Number.isFinite(id) && id > 0) {
          return lookups.suppliers[id] ? `${lookups.suppliers[id]} (#${id})` : `Supplier #${id}`
        }
      }

      if (key === 'shop_id') {
        const id = Number(value)
        if (Number.isFinite(id) && id > 0) {
          return lookups.shops[id] ?? `Shop #${id}`
        }
      }

      if (value === null || value === undefined || value === '') {
        return '-'
      }

      if (typeof value === 'object') {
        return JSON.stringify(value)
      }

      return String(value)
    },
  }))
}

export function ArchivesPage() {
  const [month, setMonth] = useState(currentMonthValue)
  const [archiveData, setArchiveData] = useState<ArchiveMonthlyResult | null>(null)
  const [activeDataset, setActiveDataset] = useState<ArchiveDatasetKey>('sales')
  const [lookups, setLookups] = useState<NameLookups>({
    products: {},
    customers: {},
    suppliers: {},
    shops: {},
  })

  const fetchArchiveMutation = useMutation({
    mutationFn: (selectedMonth: string) => archiveService.getArchivesByMonth(selectedMonth),
    onSuccess: (data) => {
      setArchiveData(data)
    },
  })

  const rows = archiveData?.data?.[activeDataset] ?? []

  const columns = useMemo(() => createColumns(rows, lookups), [rows, lookups])

  useEffect(() => {
    let isActive = true

    async function hydrateIdNames() {
      if (!archiveData) {
        if (isActive) {
          setLookups({ products: {}, customers: {}, suppliers: {}, shops: {} })
        }
        return
      }

      const allRows = Object.values(archiveData.data).flat()

      const productIds = new Set<number>()
      const customerIds = new Set<number>()
      const supplierIds = new Set<number>()
      const shopIds = new Set<number>()

      allRows.forEach((row) => {
        const productId = Number(row.product_id)
        if (Number.isFinite(productId) && productId > 0) {
          productIds.add(productId)
        }

        const customerId = Number(row.customer_id)
        if (Number.isFinite(customerId) && customerId > 0) {
          customerIds.add(customerId)
        }

        const supplierId = Number(row.supplier_id)
        if (Number.isFinite(supplierId) && supplierId > 0) {
          supplierIds.add(supplierId)
        }

        const shopId = Number(row.shop_id)
        if (Number.isFinite(shopId) && shopId > 0) {
          shopIds.add(shopId)
        }
      })

      const productsLookup: Record<number, string> = {}
      const customersLookup: Record<number, string> = {}
      const suppliersLookup: Record<number, string> = {}
      const shopsLookup: Record<number, string> = {}

      await Promise.all(
        Array.from(productIds).map(async (id) => {
          try {
            const { data } = await httpClient.get(endpoints.products.byId(id))
            const item = normalizeItemResponse<Record<string, unknown>>(data)
            const label = buildProductDisplayName(item)
            productsLookup[id] = label || `Product #${id}`
          } catch {
            productsLookup[id] = `Product #${id}`
          }
        }),
      )

      await Promise.all(
        Array.from(customerIds).map(async (id) => {
          try {
            const { data } = await httpClient.get(endpoints.customers.byId(id))
            const item = normalizeItemResponse<Record<string, unknown>>(data)
            const name = typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : `Customer #${id}`
            customersLookup[id] = name
          } catch {
            customersLookup[id] = `Customer #${id}`
          }
        }),
      )

      await Promise.all(
        Array.from(supplierIds).map(async (id) => {
          try {
            const { data } = await httpClient.get(endpoints.suppliers.byId(id))
            const item = normalizeItemResponse<Record<string, unknown>>(data)
            const name = typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : `Supplier #${id}`
            suppliersLookup[id] = name
          } catch {
            suppliersLookup[id] = `Supplier #${id}`
          }
        }),
      )

      Array.from(shopIds).forEach((id) => {
        shopsLookup[id] = `Shop #${id}`
      })

      if (isActive) {
        setLookups({
          products: productsLookup,
          customers: customersLookup,
          suppliers: suppliersLookup,
          shops: shopsLookup,
        })
      }
    }

    void hydrateIdNames()

    return () => {
      isActive = false
    }
  }, [archiveData])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!month) {
      return
    }

    fetchArchiveMutation.mutate(month)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Archives Explorer"
        description="Search archived month data and inspect all archived sales, purchases, payments, and ledger records."
      />

      <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-cyan-700" />
            Archive Month Search
          </CardTitle>
          <CardDescription className="text-slate-700">
            Pick any archived month and load all related archive tables in one view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
            <div className="w-full space-y-1.5 sm:max-w-xs">
              <Label htmlFor="archiveMonth">Month</Label>
              <Input
                id="archiveMonth"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                required
                className="bg-white"
              />
            </div>
            <Button type="submit" disabled={fetchArchiveMutation.isPending}>
              <ArchiveRestore className="h-4 w-4" />
              {fetchArchiveMutation.isPending ? 'Loading Archive...' : 'Load Archive'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {fetchArchiveMutation.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {getApiErrorMessage(fetchArchiveMutation.error, 'Failed to load archive data for this month.')}
        </div>
      ) : null}

      {archiveData ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Archive Window</CardTitle>
              <CardDescription>
                {archiveData.month} ({archiveData.from} to {archiveData.to})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {datasetMeta.map((item) => (
                  <div key={item.key} className={`rounded-lg border p-3 ${item.colorClass}`}>
                    <p className="text-xs font-medium uppercase tracking-wide">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold">{archiveData.counts?.[item.key] ?? 0}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                Archive Datasets
              </CardTitle>
              <CardDescription>
                Switch between archived tables for {archiveData.month}. Showing the top 10 fields per row.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {datasetMeta.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    size="sm"
                    variant={activeDataset === item.key ? 'default' : 'outline'}
                    onClick={() => setActiveDataset(item.key)}
                  >
                    <Database className="h-3.5 w-3.5" />
                    {item.label}
                    <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">
                      {archiveData.counts?.[item.key] ?? 0}
                    </span>
                  </Button>
                ))}
              </div>

              {columns.length === 0 ? (
                <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
                  <Table2 className="mx-auto mb-2 h-5 w-5" />
                  No records in {datasetMeta.find((item) => item.key === activeDataset)?.label} for this month.
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  rows={rows}
                  getRowId={getRowId}
                  emptyMessage="No archived records found."
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

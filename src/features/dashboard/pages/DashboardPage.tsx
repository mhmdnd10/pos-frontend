import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const dashboardMetricLabels: Record<string, string> = {
  today_sales: 'Today Sales',
  today_purchases: 'Today Purchases',
  today_returns: 'Today Returns',
  total_customers: 'Total Customers',
  total_suppliers: 'Total Suppliers',
  lowest_stock_products: 'Lowest Stock Products',
}

const preferredMetricOrder = [
  'today_sales',
  'today_returns',
  'today_purchases',
  'total_customers',
  'total_suppliers',
  'lowest_stock_products',
]

function formatMetricValue(value: unknown) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString() : String(value)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardService.getDashboard,
  })

  const dashboardEntries = (() => {
    const data = (dashboardQuery.data ?? {}) as Record<string, unknown>
    const orderedKeys = [
      ...preferredMetricOrder.filter((key) => key in data),
      ...Object.keys(data).filter((key) => !preferredMetricOrder.includes(key)),
    ]

    return orderedKeys.map((key) => ({
      key,
      label: dashboardMetricLabels[key] ?? key.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      value: formatMetricValue(data[key]),
    }))
  })()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Business overview"
        actions={
          <Button variant="outline" size="sm" onClick={() => void dashboardQuery.refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {dashboardQuery.isLoading ? (
        <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading dashboard...</div>
      ) : null}

      {dashboardQuery.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load dashboard data. {getApiErrorMessage(dashboardQuery.error, '')}
        </div>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.isError ? (
        dashboardEntries.length === 0 ? (
          <div className="rounded-md border p-6 text-sm text-muted-foreground">No dashboard data available.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardEntries.map((entry) => (
              <div key={entry.key} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{entry.label}</p>
                <p className="mt-2 text-xl font-semibold">{entry.value}</p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
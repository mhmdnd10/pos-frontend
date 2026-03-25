import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardService.getDashboard,
  })

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
        Object.keys(dashboardQuery.data ?? {}).length === 0 ? (
          <div className="rounded-md border p-6 text-sm text-muted-foreground">No dashboard data available.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(dashboardQuery.data ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{key}</p>
                <p className="mt-2 text-xl font-semibold">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
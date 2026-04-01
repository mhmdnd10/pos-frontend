import { useMutation } from '@tanstack/react-query'
import { BarChart3, CalendarClock, FileSpreadsheet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { reportService } from '@/features/reports/services/reportService'
import type { DailySummaryReport, MonthlySummaryReport } from '@/features/reports/types'
import { getApiErrorMessage } from '@/lib/api/response'

function toNumber(value: number | string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const countFormatter = new Intl.NumberFormat('en-US')

function formatAmount(value: number | string | undefined) {
  return amountFormatter.format(toNumber(value))
}

function formatCount(value: number | string | undefined) {
  return countFormatter.format(toNumber(value))
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7)
}

export function ReportsPage() {
  const [businessDate, setBusinessDate] = useState('')
  const [month, setMonth] = useState(currentMonthValue)
  const [dailySummary, setDailySummary] = useState<DailySummaryReport | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<MonthlySummaryReport | null>(null)

  const dailyMutation = useMutation({
    mutationFn: (date: string) => reportService.generateDailySummary(date || undefined),
    onSuccess: (data) => {
      setDailySummary(data)
      toast.success('Daily summary generated successfully.')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to generate daily summary.'))
    },
  })

  const monthlyMutation = useMutation({
    mutationFn: (selectedMonth: string) => reportService.getMonthlySummary(selectedMonth),
    onSuccess: (data) => {
      setMonthlyReport(data)
      toast.success('Monthly report fetched successfully.')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to fetch monthly report.'))
    },
  })

  const missingDaysHint = useMemo(() => {
    if (!monthlyReport) {
      return null
    }

    return 'Monthly totals depend on available daily summary rows. If some dates were never generated, they are not included.'
  }, [monthlyReport])

  function handleGenerateDailySummary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dailyMutation.mutate(businessDate)
  }

  function handleFetchMonthlyReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!month) {
      toast.error('Please choose a month first.')
      return
    }

    monthlyMutation.mutate(month)
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate daily summary rows and fetch monthly totals from backend report endpoints."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" />
              Daily Summary
            </CardTitle>
            <CardDescription>
              Business date is optional. Leave it empty to generate today&apos;s summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={handleGenerateDailySummary}>
              <div className="space-y-1.5">
                <Label htmlFor="businessDate">Business Date (optional)</Label>
                <Input
                  id="businessDate"
                  type="date"
                  value={businessDate}
                  onChange={(event) => setBusinessDate(event.target.value)}
                />
              </div>

              <Button type="submit" disabled={dailyMutation.isPending}>
                {dailyMutation.isPending ? 'Generating...' : 'Generate Daily Summary'}
              </Button>
            </form>

            {dailySummary ? (
              <div className="rounded-md border p-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Generated Row for {dailySummary.business_date}</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>Total Sales: {formatAmount(dailySummary.total_sales)}</p>
                  <p>Total Purchases: {formatAmount(dailySummary.total_purchases)}</p>
                  <p>Customer Payments: {formatAmount(dailySummary.customer_payments)}</p>
                  <p>Supplier Payments: {formatAmount(dailySummary.supplier_payments)}</p>
                  <p>Sales Count: {formatCount(dailySummary.sales_count)}</p>
                  <p>Purchases Count: {formatCount(dailySummary.purchases_count)}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Monthly Report
            </CardTitle>
            <CardDescription>
              Fetches totals from stored daily summary rows for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={handleFetchMonthlyReport}>
              <div className="space-y-1.5">
                <Label htmlFor="month">Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={monthlyMutation.isPending}>
                <BarChart3 className="h-4 w-4" />
                {monthlyMutation.isPending ? 'Fetching...' : 'Fetch Monthly Report'}
              </Button>
            </form>

            {monthlyReport ? (
              <div className="rounded-md border p-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Summary for {monthlyReport.month}</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>Total Sales: {formatAmount(monthlyReport.total_sales)}</p>
                  <p>Total Purchases: {formatAmount(monthlyReport.total_purchases)}</p>
                  <p>Customer Payments: {formatAmount(monthlyReport.customer_payments)}</p>
                  <p>Supplier Payments: {formatAmount(monthlyReport.supplier_payments)}</p>
                  <p>Sales Count: {formatCount(monthlyReport.sales_count)}</p>
                  <p>Purchases Count: {formatCount(monthlyReport.purchases_count)}</p>
                </div>
              </div>
            ) : null}

            {missingDaysHint ? <p className="text-xs text-muted-foreground">{missingDaysHint}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { useMutation } from '@tanstack/react-query'
import { BarChart3, CalendarClock, FileSpreadsheet, Printer, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatReportKeyValue(key: string, value: string) {
  return `${key.padEnd(18)}: ${value}`
}

function buildReportPrintHtml(
  dailySummary: DailySummaryReport | null,
  monthlyReport: MonthlySummaryReport | null,
) {
  const now = new Date()
  const lineWidth = 36
  const divider = '-'.repeat(lineWidth)
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString()

  const receiptLines = [
    'HOME DECORATION',
    'AL QMATIYEH',
    'kmatieh-main street',
    '03109497 | 03909497',
    divider,
    'REPORT PRINT',
    formatReportKeyValue('Date', date),
    formatReportKeyValue('Time', time),
    divider,
  ]

  if (dailySummary) {
    receiptLines.push(
      `DAILY SUMMARY (${dailySummary.business_date})`,
      formatReportKeyValue('Total Sales', formatAmount(dailySummary.total_sales)),
      formatReportKeyValue('Total Purchases', formatAmount(dailySummary.total_purchases)),
      formatReportKeyValue('Customer Payments', formatAmount(dailySummary.customer_payments)),
      formatReportKeyValue('Supplier Payments', formatAmount(dailySummary.supplier_payments)),
      formatReportKeyValue('Sales Count', formatCount(dailySummary.sales_count)),
      formatReportKeyValue('Purchases Count', formatCount(dailySummary.purchases_count)),
      divider,
    )
  }

  if (monthlyReport) {
    receiptLines.push(
      `MONTHLY SUMMARY (${monthlyReport.month})`,
      formatReportKeyValue('Total Sales', formatAmount(monthlyReport.total_sales)),
      formatReportKeyValue('Total Purchases', formatAmount(monthlyReport.total_purchases)),
      formatReportKeyValue('Customer Payments', formatAmount(monthlyReport.customer_payments)),
      formatReportKeyValue('Supplier Payments', formatAmount(monthlyReport.supplier_payments)),
      formatReportKeyValue('Sales Count', formatCount(monthlyReport.sales_count)),
      formatReportKeyValue('Purchases Count', formatCount(monthlyReport.purchases_count)),
      divider,
    )
  }

  receiptLines.push('Thank you')

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Report Print</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          html, body { margin: 0; padding: 0; color: #111; }
          body { font-family: Tahoma, Arial, 'Noto Naskh Arabic', 'Segoe UI', sans-serif; font-size: 14px; }
          .receipt {
            width: 74mm;
            margin: 0 auto;
            padding: 1mm;
            line-height: 1.35;
            white-space: pre;
            text-align: left;
            direction: ltr;
            unicode-bidi: plaintext;
          }
        </style>
      </head>
      <body>
        <pre class="receipt">${escapeHtml(receiptLines.join('\r\n'))}</pre>
      </body>
    </html>
  `
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7)
}

function currentDateValue() {
  return new Date().toISOString().slice(0, 10)
}

export function ReportsPage() {
  const [businessDate, setBusinessDate] = useState(currentDateValue)
  const [month, setMonth] = useState(currentMonthValue)
  const [dailySummary, setDailySummary] = useState<DailySummaryReport | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<MonthlySummaryReport | null>(null)
  const [isAutoLoading, setIsAutoLoading] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)

  const dailyMutation = useMutation({
    mutationFn: (date: string) => reportService.generateDailySummary(date || undefined),
    onSuccess: (data) => {
      setDailySummary(data)
      setLastRefreshedAt(new Date().toLocaleString())
      toast.success('Daily summary generated successfully.')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to generate daily summary.'))
    },
  })

  const dailyFetchMutation = useMutation({
    mutationFn: (date: string) => reportService.getDailySummary(date),
    onSuccess: (data) => {
      setDailySummary(data)
      setLastRefreshedAt(new Date().toLocaleString())
      toast.success('Daily summary fetched successfully.')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to fetch daily summary.'))
    },
  })

  const monthlyMutation = useMutation({
    mutationFn: (selectedMonth: string) => reportService.getMonthlySummary(selectedMonth),
    onSuccess: (data) => {
      setMonthlyReport(data)
      setLastRefreshedAt(new Date().toLocaleString())
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

  useEffect(() => {
    let isMounted = true

    async function loadSummariesOnOpen() {
      setIsAutoLoading(true)

      const [dailyResult, monthlyResult] = await Promise.allSettled([
        reportService.getDailySummary(businessDate),
        reportService.getMonthlySummary(month),
      ])

      if (!isMounted) {
        return
      }

      let successCount = 0

      if (dailyResult.status === 'fulfilled') {
        setDailySummary(dailyResult.value)
        successCount += 1
      }

      if (monthlyResult.status === 'fulfilled') {
        setMonthlyReport(monthlyResult.value)
        successCount += 1
      }

      if (successCount > 0) {
        setLastRefreshedAt(new Date().toLocaleString())
      }

      if (dailyResult.status === 'rejected' && monthlyResult.status === 'rejected') {
        toast.error('Could not auto-load saved summaries. Use Fetch buttons to retry.')
      }

      setIsAutoLoading(false)
    }

    void loadSummariesOnOpen()

    return () => {
      isMounted = false
    }
  }, [])

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

  function handleFetchDailySummary() {
    if (!businessDate) {
      toast.error('Please choose a business date first.')
      return
    }

    dailyFetchMutation.mutate(businessDate)
  }

  function handlePrintReport() {
    if (!dailySummary && !monthlyReport) {
      toast.error('Generate or fetch a report before printing.')
      return
    }

    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) {
      toast.error('Please allow popups to print.')
      return
    }

    popup.document.open()
    popup.document.write(buildReportPrintHtml(dailySummary, monthlyReport))
    popup.document.close()
    popup.focus()
    popup.print()
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Saved daily and monthly summaries auto-load when this page opens."
        actions={
          <Button type="button" variant="outline" onClick={handlePrintReport}>
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="font-medium">Summary Status:</span>
        {isAutoLoading ? <span className="text-muted-foreground">Auto-loading saved summaries...</span> : <span>Ready</span>}
        {lastRefreshedAt ? <span className="text-muted-foreground">Last refreshed: {lastRefreshedAt}</span> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" />
              Daily Summary
            </CardTitle>
            <CardDescription>
              Auto-loads today&apos;s saved summary. You can still fetch a different date or generate a new row.
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

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={dailyMutation.isPending || dailyFetchMutation.isPending || isAutoLoading}>
                  {dailyMutation.isPending ? 'Generating...' : 'Generate Daily Summary'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchDailySummary}
                  disabled={dailyMutation.isPending || dailyFetchMutation.isPending || isAutoLoading}
                >
                  <Search className="h-4 w-4" />
                  {dailyFetchMutation.isPending ? 'Fetching...' : 'Fetch Daily Summary'}
                </Button>
              </div>
            </form>

            {dailySummary ? (
              <div className="rounded-md border p-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Summary for {dailySummary.business_date}</p>
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
              Auto-loads current month totals from stored daily summary rows.
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

              <Button type="submit" disabled={monthlyMutation.isPending || isAutoLoading}>
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

import { useMutation } from '@tanstack/react-query'
import { Archive, BarChart3, CalendarClock, FileSpreadsheet, Printer, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { archiveService } from '@/features/reports/services/archiveService'
import { reportService } from '@/features/reports/services/reportService'
import type { ArchiveSummary, DailySummaryReport, MonthlySummaryReport } from '@/features/reports/types'
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

function buildReportPrintHtml(title: string, period: string, rows: Array<{ label: string; value: string }>) {
  const now = new Date()
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString()

  const renderRows = (rowsToRender: Array<{ label: string; value: string }>) =>
    rowsToRender
      .map(
        (row) => `
          <div class="metric-row">
            <span class="metric-label">${escapeHtml(row.label)}</span>
            <span class="metric-value">${escapeHtml(row.value)}</span>
          </div>
        `,
      )
      .join('')

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Report Print</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          html, body { margin: 0; padding: 0; color: #111; }
          body { font-family: Tahoma, Arial, 'Noto Naskh Arabic', 'Segoe UI', sans-serif; font-size: 14px; background: #fff; }
          .receipt {
            width: 78mm;
            margin: 0 auto;
            padding: 0.5mm;
            line-height: 1.4;
            text-align: left;
            direction: ltr;
            unicode-bidi: plaintext;
          }
          .center-line {
            text-align: left;
            font-weight: 800;
            color: #111827;
            letter-spacing: 0.2px;
          }
          .muted-line {
            text-align: left;
            font-size: 12px;
            color: #111827;
            font-weight: 700;
          }
          .divider {
            border-top: 1px dashed #475569;
            margin: 6px 0;
          }
          .meta-row {
            display: flex;
            justify-content: flex-start;
            gap: 8px;
            align-items: center;
            font-size: 12px;
            color: #1f2937;
            margin: 2px 0;
          }
          .meta-label {
            font-weight: 700;
          }
          .section {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 5px 4px;
            margin-bottom: 8px;
            background: #f8fafc;
            width: 100%;
          }
          .section-title {
            text-align: left;
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
            direction: rtl;
            unicode-bidi: plaintext;
          }
          .metric-row {
            display: flex;
            align-items: baseline;
            gap: 2mm;
            padding: 3px 0 4px;
            border-bottom: 1px dotted #cbd5e1;
          }
          .metric-row:last-child {
            border-bottom: 0;
          }
          .metric-label {
            direction: rtl;
            unicode-bidi: plaintext;
            text-align: left;
            color: #0f172a;
            font-size: 11px;
            font-weight: 700;
            min-width: 0;
            flex: 0 0 41mm;
            overflow-wrap: anywhere;
            line-height: 1.25;
          }
          .metric-value {
            color: #111827;
            font-weight: 700;
            font-size: 12px;
            min-width: 0;
            text-align: left;
            white-space: nowrap;
            flex: 0 1 auto;
          }
          .thanks {
            text-align: left;
            margin-top: 8px;
            font-weight: 700;
            color: #0f172a;
            direction: rtl;
            unicode-bidi: plaintext;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center-line">HOME DECORATION</div>
          <div class="center-line">AL QMATIYEH</div>
          <div class="muted-line">kmatieh-main street</div>
          <div class="muted-line">03109497 | 03909497</div>

          <div class="divider"></div>
          <div class="center-line">${escapeHtml(title)}</div>
          <div class="meta-row"><span class="meta-label">Date</span><span>${escapeHtml(date)}</span></div>
          <div class="meta-row"><span class="meta-label">Time</span><span>${escapeHtml(time)}</span></div>
          <div class="divider"></div>

          <section class="section">
            <div class="section-title">${escapeHtml(period)}</div>
            ${renderRows(rows)}
          </section>

          <div class="divider"></div>
          <div class="thanks">شكرا لشرائكم</div>
        </div>
      </body>
    </html>
  `
}

function getDailyPrintRows(dailySummary: DailySummaryReport) {
  return [
    { label: 'إجمالي المبيعات', value: formatAmount(dailySummary.total_sales) },
    { label: 'إجمالي المرتجعات', value: formatAmount(dailySummary.total_return_sales) },
    { label: 'إجمالي المشتريات', value: formatAmount(dailySummary.total_purchases) },
    { label: 'دفعات العملاء', value: formatAmount(dailySummary.customer_payments) },
    { label: 'دفعات الموردين', value: formatAmount(dailySummary.supplier_payments) },
    { label: 'عدد المبيعات', value: formatCount(dailySummary.sales_count) },
    { label: 'عدد المشتريات', value: formatCount(dailySummary.purchases_count) },
  ]
}

function getMonthlyPrintRows(monthlyReport: MonthlySummaryReport) {
  return [
    { label: 'إجمالي المبيعات', value: formatAmount(monthlyReport.total_sales) },
    { label: 'إجمالي المرتجعات', value: formatAmount(monthlyReport.total_return_sales) },
    { label: 'إجمالي المشتريات', value: formatAmount(monthlyReport.total_purchases) },
    { label: 'دفعات العملاء', value: formatAmount(monthlyReport.customer_payments) },
    { label: 'دفعات الموردين', value: formatAmount(monthlyReport.supplier_payments) },
    { label: 'عدد المبيعات', value: formatCount(monthlyReport.sales_count) },
    { label: 'عدد المشتريات', value: formatCount(monthlyReport.purchases_count) },
  ]
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7)
}

function currentDateValue() {
  return new Date().toISOString().slice(0, 10)
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return getApiErrorMessage(error, fallback)
}

export function ReportsPage() {
  const [businessDate, setBusinessDate] = useState(currentDateValue)
  const [month, setMonth] = useState(currentMonthValue)
  const [dailySummary, setDailySummary] = useState<DailySummaryReport | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<MonthlySummaryReport | null>(null)
  const [archiveResult, setArchiveResult] = useState<ArchiveSummary | null>(null)
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
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

  const archiveMutation = useMutation({
    mutationFn: async (selectedMonth: string) => {
      const archiveResponse = await archiveService.archiveClosedMonth(selectedMonth)

      if (archiveResponse.status !== 'success') {
        throw new Error(archiveResponse.error || 'Failed to archive the selected month.')
      }

      return archiveResponse
    },
    onSuccess: (data) => {
      setArchiveResult(data)
      setIsArchiveConfirmOpen(false)
      setLastRefreshedAt(new Date().toLocaleString())
      toast.success(`Archived ${data.month} successfully.`)
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error, 'Failed to archive the selected month.'))
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

  function handleArchiveMonth() {
    if (!month) {
      toast.error('Please choose a month first.')
      return
    }

    archiveMutation.mutate(month)
  }

  function openPrintPopup(html: string) {
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) {
      toast.error('Please allow popups to print.')
      return
    }

    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  function handlePrintDailyReport() {
    if (!dailySummary) {
      toast.error('Generate or fetch daily summary before printing.')
      return
    }

    openPrintPopup(
      buildReportPrintHtml('DAILY REPORT PRINT', `ملخص يومي (${dailySummary.business_date})`, getDailyPrintRows(dailySummary)),
    )
  }

  function handlePrintMonthlyReport() {
    if (!monthlyReport) {
      toast.error('Fetch monthly report before printing.')
      return
    }

    openPrintPopup(
      buildReportPrintHtml('MONTHLY REPORT PRINT', `ملخص شهري (${monthlyReport.month})`, getMonthlyPrintRows(monthlyReport)),
    )
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Saved daily and monthly summaries auto-load when this page opens."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to={routePaths.archives}>
                <Archive className="h-4 w-4" />
                Open Archives
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={handlePrintDailyReport}>
              <Printer className="h-4 w-4" />
              Print Daily
            </Button>
            <Button type="button" variant="outline" onClick={handlePrintMonthlyReport}>
              <Printer className="h-4 w-4" />
              Print Monthly
            </Button>
          </div>
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
                  <p>Total Returns: {formatAmount(dailySummary.total_return_sales)}</p>
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

              <div className="space-y-3">
                <Button type="submit" disabled={monthlyMutation.isPending || archiveMutation.isPending || isAutoLoading}>
                  <BarChart3 className="h-4 w-4" />
                  {monthlyMutation.isPending ? 'Fetching...' : 'Fetch Monthly Report'}
                </Button>

                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-destructive">Archive closed month</p>
                      <p className="text-sm text-muted-foreground">
                        Moves the active records for {month || 'the selected month'} into archive tables.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsArchiveConfirmOpen(true)}
                      disabled={monthlyMutation.isPending || archiveMutation.isPending || isAutoLoading}
                      className="sm:min-w-36 text-white"
                    >
                      <Archive className="h-4 w-4" />
                      {archiveMutation.isPending ? 'Archiving...' : 'Archive Month'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {monthlyReport ? (
              <div className="rounded-md border p-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Summary for {monthlyReport.month}</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>Total Sales: {formatAmount(monthlyReport.total_sales)}</p>
                  <p>Total Returns: {formatAmount(monthlyReport.total_return_sales)}</p>
                  <p>Total Purchases: {formatAmount(monthlyReport.total_purchases)}</p>
                  <p>Customer Payments: {formatAmount(monthlyReport.customer_payments)}</p>
                  <p>Supplier Payments: {formatAmount(monthlyReport.supplier_payments)}</p>
                  <p>Sales Count: {formatCount(monthlyReport.sales_count)}</p>
                  <p>Purchases Count: {formatCount(monthlyReport.purchases_count)}</p>
                </div>
              </div>
            ) : null}

            {archiveResult ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 shadow-sm">
                <p className="font-medium">Archive completed for {archiveResult.month}</p>
                <p className="mt-1 text-emerald-900/80">
                  Window: {archiveResult.from} to {archiveResult.to}
                </p>
                <p className="mt-2 text-emerald-900/90">
                  Sales archived: {archiveResult.tables_archived.sales ?? 0} · Purchases archived: {archiveResult.tables_archived.purchases ?? 0}
                </p>
              </div>
            ) : null}

            {missingDaysHint ? <p className="text-xs text-muted-foreground">{missingDaysHint}</p> : null}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={isArchiveConfirmOpen}
        onOpenChange={setIsArchiveConfirmOpen}
        title="Archive selected month"
        description={`Archive and remove the active records for ${month || 'the selected month'}. This action cannot be undone.`}
        confirmText="Archive"
        onConfirm={handleArchiveMonth}
        isLoading={archiveMutation.isPending}
      />
    </div>
  )
}

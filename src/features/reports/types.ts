export interface DailySummaryReport {
  shop_id: number
  business_date: string
  total_sales: number | string
  total_return_sales?: number | string
  total_purchases: number | string
  customer_payments: number | string
  supplier_payments: number | string
  sales_count: number
  purchases_count: number
  created_at?: string
  updated_at?: string
}

export interface MonthlySummaryReport {
  shop_id: number
  month: string
  total_sales: number | string
  total_return_sales?: number | string
  total_purchases: number | string
  customer_payments: number | string
  supplier_payments: number | string
  sales_count: number
  purchases_count: number
}

export interface ArchiveSummary {
  month: string
  from: string
  to: string
  status: 'pending' | 'success' | 'failed'
  tables_archived: Record<string, number>
  sales_deleted?: number
  purchases_deleted?: number
  error: string | null
}

export interface ArchiveMonthlyCounts {
  sales: number
  sale_items: number
  customer_payments: number
  customer_ledgers: number
  purchases: number
  purchase_items: number
  supplier_payments: number
  supplier_ledgers: number
}

export type ArchiveRow = Record<string, unknown>

export interface ArchiveMonthlyData {
  sales: ArchiveRow[]
  sale_items: ArchiveRow[]
  customer_payments: ArchiveRow[]
  customer_ledgers: ArchiveRow[]
  purchases: ArchiveRow[]
  purchase_items: ArchiveRow[]
  supplier_payments: ArchiveRow[]
  supplier_ledgers: ArchiveRow[]
}

export interface ArchiveMonthlyResult {
  status: 'success' | 'failed'
  month: string
  from: string
  to: string
  counts: ArchiveMonthlyCounts
  data: ArchiveMonthlyData
}

export type ArchiveDatasetKey = keyof ArchiveMonthlyData

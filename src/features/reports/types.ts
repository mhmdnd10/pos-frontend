export interface DailySummaryReport {
  shop_id: number
  business_date: string
  total_sales: number | string
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
  total_purchases: number | string
  customer_payments: number | string
  supplier_payments: number | string
  sales_count: number
  purchases_count: number
}

export interface Sale {
  id: number
  customer_id?: number | null
  sale_date?: string | null
  date?: string | null
  payment_method?: string | null
  total_amount?: number | string | null
  total?: number | string | null
  paid_amount?: number | string | null
  due_amount?: number | string | null
  status?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

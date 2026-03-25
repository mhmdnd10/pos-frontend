export interface Purchase {
  id: number
  supplier_id?: number | null
  purchase_date?: string | null
  date?: string | null
  total_amount?: number | string | null
  paid_amount?: number | string | null
  remaining_amount?: number | string | null
  total?: number | string | null
  status?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

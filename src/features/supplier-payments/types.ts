export interface SupplierPayment {
  id: number
  supplier_id?: number | null
  amount?: number | string | null
  payment_method?: string | null
  reference?: string | null
  paid_at?: string | null
  payment_date?: string | null
  note?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

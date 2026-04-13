export interface Product {
  id: number
  name: string
  barcode?: string | null
  size?: string | null
  color?: string | null
  brand?: string | null
  model?: string | null
  shelf_location?: string | null
  search_text?: string | null
  category_name?: string | null
  category?: {
    id?: number
    name?: string | null
  } | null
  sku?: string | null
  category_id?: number | null
  sale_price?: number | string | null
  purchase_price?: number | string | null
  stock_quantity?: number | string | null
  price?: number | string | null
  cost_price?: number | string | null
  stock?: number | string | null
  image?: string | null
  is_active?: boolean | null
  minimum_stock_alert?: number | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProductPayload {
  name: string
  barcode?: string
  size?: string
  color?: string
  brand?: string
  model?: string
  shelf_location?: string
  category_id?: number
  sale_price?: number
  purchase_price?: number
  stock_quantity?: number
  image?: File
  is_active?: boolean
  minimum_stock_alert?: number
  sku?: string
  price?: number
  cost_price?: number
  stock?: number
  description?: string
}

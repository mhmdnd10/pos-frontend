export interface Category {
  id: number
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface CategoryPayload {
  name: string
  description?: string
}

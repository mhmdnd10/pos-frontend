export interface Customer {
  id: number
  name: string
  phone?: string | null
  address?: string | null
  balance?: number | string | null
  created_at?: string
  updated_at?: string
}

export interface CustomerPayload {
  name: string
  phone?: string
  address?: string
}

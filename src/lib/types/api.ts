export interface ApiMessageResponse {
  message: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedResponse<TData> {
  data: TData[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export function getPaginationMeta<TData>(payload: PaginatedResponse<TData>): PaginationMeta {
  return {
    current_page: payload.current_page,
    last_page: payload.last_page,
    per_page: payload.per_page,
    total: payload.total,
  }
}
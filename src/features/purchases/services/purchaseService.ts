import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Purchase } from '@/features/purchases/types'

interface PurchaseListFilters {
  from?: string
  to?: string
}

export const purchaseService = {
  async list(page = 1, filters: PurchaseListFilters = {}) {
    const { data } = await httpClient.get(endpoints.purchases.list, {
      params: {
        page,
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
      },
    })
    return normalizeListResponse<Purchase>(data)
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await httpClient.post(endpoints.purchases.list, payload)
    return normalizeItemResponse<Purchase>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.purchases.byId(id))
    return normalizeItemResponse<Purchase>(data)
  },
}

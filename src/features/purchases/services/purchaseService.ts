import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Purchase } from '@/features/purchases/types'

export const purchaseService = {
  async list(page = 1) {
    const { data } = await httpClient.get(endpoints.purchases.list, { params: { page } })
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

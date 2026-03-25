import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Sale } from '@/features/sales/types'

export const saleService = {
  async list(page = 1) {
    const { data } = await httpClient.get(endpoints.sales.list, { params: { page } })
    return normalizeListResponse<Sale>(data)
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await httpClient.post(endpoints.sales.list, payload)
    return normalizeItemResponse<Sale>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.sales.byId(id))
    return normalizeItemResponse<Sale>(data)
  },
}

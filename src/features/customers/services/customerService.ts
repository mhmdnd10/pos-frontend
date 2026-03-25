import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Customer, CustomerPayload } from '@/features/customers/types'

export const customerService = {
  async list(page = 1, search?: string) {
    const trimmedSearch = search?.trim()
    const { data } = await httpClient.get(endpoints.customers.list, {
      params: {
        page,
        ...(trimmedSearch ? { search: trimmedSearch, q: trimmedSearch } : {}),
      },
    })
    return normalizeListResponse<Customer>(data)
  },

  async create(payload: CustomerPayload) {
    const { data } = await httpClient.post(endpoints.customers.list, payload)
    return normalizeItemResponse<Customer>(data)
  },

  async update(id: number, payload: CustomerPayload) {
    const { data } = await httpClient.put(endpoints.customers.byId(id), payload)
    return normalizeItemResponse<Customer>(data)
  },

  async remove(id: number) {
    await httpClient.delete(endpoints.customers.byId(id))
  },

  async ledger(id: number, page = 1) {
    const { data } = await httpClient.get(endpoints.customers.ledger(id), { params: { page } })
    return normalizeListResponse<Record<string, unknown>>(data)
  },
}

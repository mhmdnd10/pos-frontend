import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Supplier, SupplierPayload } from '@/features/suppliers/types'

export const supplierService = {
  async list(page = 1, search?: string) {
    const trimmedSearch = search?.trim()
    const { data } = await httpClient.get(endpoints.suppliers.list, {
      params: {
        page,
        ...(trimmedSearch ? { search: trimmedSearch, q: trimmedSearch } : {}),
      },
    })
    return normalizeListResponse<Supplier>(data)
  },

  async create(payload: SupplierPayload) {
    const { data } = await httpClient.post(endpoints.suppliers.list, payload)
    return normalizeItemResponse<Supplier>(data)
  },

  async update(id: number, payload: SupplierPayload) {
    const { data } = await httpClient.put(endpoints.suppliers.byId(id), payload)
    return normalizeItemResponse<Supplier>(data)
  },

  async remove(id: number) {
    await httpClient.delete(endpoints.suppliers.byId(id))
  },

  async ledger(id: number, page = 1) {
    const { data } = await httpClient.get(endpoints.suppliers.ledger(id), { params: { page } })
    return normalizeListResponse<Record<string, unknown>>(data)
  },
}

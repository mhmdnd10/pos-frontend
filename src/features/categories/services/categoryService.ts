import { httpClient } from '@/lib/api/httpClient'
import { normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Category, CategoryPayload } from '@/features/categories/types'

export const categoryService = {
  async list(page = 1, search?: string) {
    const trimmedSearch = search?.trim()
    const { data } = await httpClient.get(endpoints.categories.list, {
      params: {
        page,
        ...(trimmedSearch ? { search: trimmedSearch, q: trimmedSearch } : {}),
      },
    })
    return normalizeListResponse<Category>(data)
  },

  async create(payload: CategoryPayload) {
    const { data } = await httpClient.post<Category>(endpoints.categories.list, payload)
    return data
  },

  async update(id: number, payload: CategoryPayload) {
    const { data } = await httpClient.put<Category>(endpoints.categories.byId(id), payload)
    return data
  },

  async remove(id: number) {
    await httpClient.delete(endpoints.categories.byId(id))
  },
}

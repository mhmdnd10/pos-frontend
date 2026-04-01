import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Product, ProductPayload } from '@/features/products/types'

interface ProductListOptions {
  search?: string
  categoryId?: number
}

export const productService = {
  async list(page = 1, options: ProductListOptions = {}) {
    const search = options.search?.trim()
    const categoryId = options.categoryId

    const hasCategoryFilter = Number.isFinite(categoryId)
    const shouldUseCategoryEndpoint = hasCategoryFilter && !search

    const endpoint = shouldUseCategoryEndpoint
      ? endpoints.products.byCategory(Number(categoryId))
      : endpoints.products.list

    const params = {
      page,
      ...(search ? { search } : {}),
      ...(!shouldUseCategoryEndpoint && hasCategoryFilter ? { category_id: Number(categoryId) } : {}),
    }

    const { data } = await httpClient.get(endpoint, { params })
    return normalizeListResponse<Product>(data)
  },

  async create(payload: ProductPayload) {
    const { data } = await httpClient.post(endpoints.products.list, payload)
    return normalizeItemResponse<Product>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.products.byId(id))
    return normalizeItemResponse<Product>(data)
  },

  async update(id: number, payload: ProductPayload) {
    const { data } = await httpClient.put(endpoints.products.byId(id), payload)
    return normalizeItemResponse<Product>(data)
  },

  async remove(id: number) {
    await httpClient.delete(endpoints.products.byId(id))
  },

  async import(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await httpClient.post(endpoints.products.import, formData)
    return data
  },
}

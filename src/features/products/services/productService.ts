import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Product, ProductPayload } from '@/features/products/types'

function appendIfPresent(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return
  }

  if (value instanceof File) {
    formData.append(key, value)
    return
  }

  formData.append(key, String(value))
}

function toProductFormData(payload: ProductPayload) {
  const formData = new FormData()

  appendIfPresent(formData, 'name', payload.name)
  appendIfPresent(formData, 'barcode', payload.barcode)
  appendIfPresent(formData, 'size', payload.size)
  appendIfPresent(formData, 'color', payload.color)
  appendIfPresent(formData, 'brand', payload.brand)
  appendIfPresent(formData, 'model', payload.model)
  appendIfPresent(formData, 'shelf_location', payload.shelf_location)
  appendIfPresent(formData, 'category_id', payload.category_id)
  appendIfPresent(formData, 'sale_price', payload.sale_price)
  appendIfPresent(formData, 'purchase_price', payload.purchase_price)
  appendIfPresent(formData, 'stock_quantity', payload.stock_quantity)
  appendIfPresent(formData, 'is_active', payload.is_active)
  appendIfPresent(formData, 'minimum_stock_alert', payload.minimum_stock_alert)
  appendIfPresent(formData, 'description', payload.description)
  appendIfPresent(formData, 'image', payload.image)

  return formData
}

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
    const { data } = await httpClient.post(endpoints.products.list, toProductFormData(payload), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return normalizeItemResponse<Product>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.products.byId(id))
    return normalizeItemResponse<Product>(data)
  },

  async update(id: number, payload: ProductPayload) {
    const { data } = await httpClient.post(endpoints.products.byId(id), (() => {
      const formData = toProductFormData(payload)
      formData.append('_method', 'PUT')
      return formData
    })(), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
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

import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { SupplierPayment } from '@/features/supplier-payments/types'

export const supplierPaymentService = {
  async list(page = 1) {
    const { data } = await httpClient.get(endpoints.supplierPayments.list, { params: { page } })
    return normalizeListResponse<SupplierPayment>(data)
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await httpClient.post(endpoints.supplierPayments.list, payload)
    return normalizeItemResponse<SupplierPayment>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.supplierPayments.byId(id))
    return normalizeItemResponse<SupplierPayment>(data)
  },
}

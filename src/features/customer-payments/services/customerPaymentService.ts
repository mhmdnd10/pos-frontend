import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { CustomerPayment } from '@/features/customer-payments/types'

export const customerPaymentService = {
  async list(page = 1) {
    const { data } = await httpClient.get(endpoints.customerPayments.list, { params: { page } })
    return normalizeListResponse<CustomerPayment>(data)
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await httpClient.post(endpoints.customerPayments.list, payload)
    return normalizeItemResponse<CustomerPayment>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.customerPayments.byId(id))
    return normalizeItemResponse<CustomerPayment>(data)
  },
}

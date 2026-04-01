import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { DailySummaryReport, MonthlySummaryReport } from '@/features/reports/types'

export const reportService = {
  async generateDailySummary(businessDate?: string) {
    const payload = businessDate ? { business_date: businessDate } : {}
    const { data } = await httpClient.post(endpoints.reports.dailySummary, payload)
    return normalizeItemResponse<DailySummaryReport>(data)
  },

  async getMonthlySummary(month: string) {
    const { data } = await httpClient.get(endpoints.reports.monthlySummary, {
      params: { month },
    })
    return normalizeItemResponse<MonthlySummaryReport>(data)
  },
}

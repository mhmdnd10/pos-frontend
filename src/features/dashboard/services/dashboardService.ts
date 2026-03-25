import { endpoints } from '@/lib/constants/endpoints'
import { httpClient } from '@/lib/api/httpClient'
import type { DashboardResponse } from '@/features/dashboard/types/dashboardTypes'

export const dashboardService = {
  async getDashboard() {
    const { data } = await httpClient.get<DashboardResponse>(endpoints.dashboard)
    return data
  },
}
import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { ArchiveMonthlyResult, ArchiveSummary } from '@/features/reports/types'

function toArchiveMonthlyResult(payload: unknown): ArchiveMonthlyResult {
  const source = (payload ?? {}) as Record<string, unknown>

  // Supports both raw shape and wrapped { data: rawShape } responses.
  // Raw archive payload also has a "data" field, so we must not unwrap blindly.
  const hasRootArchiveFields =
    'month' in source ||
    'from' in source ||
    'to' in source ||
    'counts' in source ||
    'status' in source

  const root = (hasRootArchiveFields
    ? source
    : source.data && typeof source.data === 'object' && !Array.isArray(source.data)
      ? source.data
      : source) as Record<string, unknown>

  const nestedData =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : {}

  const nestedCounts =
    root.counts && typeof root.counts === 'object' && !Array.isArray(root.counts)
      ? (root.counts as Record<string, unknown>)
      : {}

  return {
    status: (root.status as 'success' | 'failed') ?? 'success',
    month: String(root.month ?? ''),
    from: String(root.from ?? ''),
    to: String(root.to ?? ''),
    counts: {
      sales: Number(nestedCounts.sales ?? 0),
      sale_items: Number(nestedCounts.sale_items ?? 0),
      customer_payments: Number(nestedCounts.customer_payments ?? 0),
      customer_ledgers: Number(nestedCounts.customer_ledgers ?? 0),
      purchases: Number(nestedCounts.purchases ?? 0),
      purchase_items: Number(nestedCounts.purchase_items ?? 0),
      supplier_payments: Number(nestedCounts.supplier_payments ?? 0),
      supplier_ledgers: Number(nestedCounts.supplier_ledgers ?? 0),
    },
    data: {
      sales: Array.isArray(nestedData.sales) ? nestedData.sales : [],
      sale_items: Array.isArray(nestedData.sale_items) ? nestedData.sale_items : [],
      customer_payments: Array.isArray(nestedData.customer_payments) ? nestedData.customer_payments : [],
      customer_ledgers: Array.isArray(nestedData.customer_ledgers) ? nestedData.customer_ledgers : [],
      purchases: Array.isArray(nestedData.purchases) ? nestedData.purchases : [],
      purchase_items: Array.isArray(nestedData.purchase_items) ? nestedData.purchase_items : [],
      supplier_payments: Array.isArray(nestedData.supplier_payments) ? nestedData.supplier_payments : [],
      supplier_ledgers: Array.isArray(nestedData.supplier_ledgers) ? nestedData.supplier_ledgers : [],
    },
  }
}

export const archiveService = {
  async archiveClosedMonth(month?: string) {
    const payload = month ? { month } : {}
    const { data } = await httpClient.post(endpoints.archives, payload)

    return normalizeItemResponse<ArchiveSummary>(data)
  },

  async getArchivesByMonth(month: string) {
    const { data } = await httpClient.get(endpoints.archives, {
      params: { month },
    })

    return toArchiveMonthlyResult(data)
  },
}
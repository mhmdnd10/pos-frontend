import { httpClient } from '@/lib/api/httpClient'
import { normalizeItemResponse, normalizeListResponse } from '@/lib/api/response'
import { endpoints } from '@/lib/constants/endpoints'
import type { Sale } from '@/features/sales/types'

interface SaleListFilters {
  from?: string
  to?: string
}

function readInvoiceCandidate(source: Record<string, unknown>) {
  const value =
    source.invoice_number ??
    source.invoice ??
    source.invoice_no ??
    source.invoiceNumber ??
    source.bill_no ??
    source.reference_number
  return typeof value === 'string' ? value.trim() : ''
}

function matchesInvoice(source: Record<string, unknown>, invoiceNumber: string) {
  const normalizedTarget = invoiceNumber.trim().toLowerCase()
  const current = readInvoiceCandidate(source).toLowerCase()
  if (current && current === normalizedTarget) {
    return true
  }

  const id = Number(source.id)
  if (Number.isFinite(id) && id > 0) {
    const generated = `inv-${String(id).padStart(6, '0')}`
    return generated === normalizedTarget
  }

  return false
}

export const saleService = {
  async list(page = 1, filters: SaleListFilters = {}) {
    const { data } = await httpClient.get(endpoints.sales.list, {
      params: {
        page,
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
      },
    })
    return normalizeListResponse<Sale>(data)
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await httpClient.post(endpoints.sales.list, payload)
    return normalizeItemResponse<Sale>(data)
  },

  async getById(id: number) {
    const { data } = await httpClient.get(endpoints.sales.byId(id))
    return normalizeItemResponse<Sale>(data)
  },

  async getInvoiceNumber(saleId: number) {
    const candidates = [
      endpoints.sales.invoiceNumber(saleId),
      `/api/sales/invoice/${saleId}`,
      `/api/sales/${saleId}/invoice-number`,
      `/api/sales/${saleId}/invoice`,
    ]

    let lastError: unknown = null

    for (const endpoint of candidates) {
      try {
        const { data } = await httpClient.get(endpoint)
        const normalized = normalizeItemResponse<Record<string, unknown>>(data)
        const value = normalized.invoice_number
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim()
        }
      } catch (error) {
        lastError = error
      }
    }

    throw lastError ?? new Error('Unable to fetch invoice number')
  },

  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await httpClient.put(endpoints.sales.byId(id), payload)
    return normalizeItemResponse<Sale>(data)
  },

  async getByInvoice(invoiceNumber: string) {
    const normalizedInvoice = invoiceNumber.trim()

    const invoiceMatch = normalizedInvoice.match(/^INV-(\d+)$/i)
    if (invoiceMatch) {
      const saleId = Number(invoiceMatch[1])
      if (Number.isFinite(saleId) && saleId > 0) {
        try {
          return await this.getById(saleId)
        } catch {
          // Fall through to other lookup strategies.
        }
      }
    }

    if (/^\d+$/.test(normalizedInvoice)) {
      const saleId = Number(normalizedInvoice)
      if (Number.isFinite(saleId) && saleId > 0) {
        try {
          return await this.getById(saleId)
        } catch {
          // Fall through to other lookup strategies.
        }
      }
    }

    const candidates = [
      endpoints.sales.byInvoice(normalizedInvoice),
      `/api/sales/by-invoice/${encodeURIComponent(normalizedInvoice)}`,
    ]

    let lastError: unknown = null

    for (const endpoint of candidates) {
      try {
        const { data } = await httpClient.get(endpoint)
        return normalizeItemResponse<Sale>(data)
      } catch (error) {
        lastError = error
      }
    }

    const listParamVariants: Array<Record<string, unknown>> = [
      { page: 1, invoice_number: normalizedInvoice },
      { page: 1, invoice: normalizedInvoice },
      { page: 1, search: normalizedInvoice },
      { page: 1, q: normalizedInvoice },
      { page: 1 },
    ]

    for (const params of listParamVariants) {
      try {
        const { data } = await httpClient.get(endpoints.sales.list, { params })
        const normalizedList = normalizeListResponse<Sale>(data)
        const matched = normalizedList.items.find((sale) => matchesInvoice(sale as Record<string, unknown>, normalizedInvoice))
        const candidateId = Number(matched?.id)

        if (Number.isFinite(candidateId) && candidateId > 0) {
          return this.getById(candidateId)
        }

        const lastPage = Number(normalizedList.meta?.last_page ?? 1)
        if (lastPage > 1 && lastPage <= 30 && Object.keys(params).length <= 2) {
          for (let page = 2; page <= lastPage; page += 1) {
            const { data: pagedData } = await httpClient.get(endpoints.sales.list, {
              params: { ...params, page },
            })
            const pagedList = normalizeListResponse<Sale>(pagedData)
            const pagedMatch = pagedList.items.find((sale) =>
              matchesInvoice(sale as Record<string, unknown>, normalizedInvoice),
            )
            const pagedId = Number(pagedMatch?.id)
            if (Number.isFinite(pagedId) && pagedId > 0) {
              return this.getById(pagedId)
            }
          }
        }
      } catch (error) {
        lastError = error
      }
    }

    throw lastError ?? new Error('Unable to fetch sale by invoice')
  },

  async updateByInvoice(invoiceNumber: string, payload: Record<string, unknown>) {
    const normalizedInvoice = invoiceNumber.trim()

    try {
      const { data } = await httpClient.put(endpoints.sales.updateByInvoice(normalizedInvoice), payload)
      return normalizeItemResponse<Sale>(data)
    } catch {
      const sale = await this.getByInvoice(normalizedInvoice)
      const saleId = Number(sale.id)

      if (!Number.isFinite(saleId) || saleId <= 0) {
        throw new Error('Unable to resolve sale id from invoice')
      }

      return this.update(saleId, payload)
    }
  },

  async quickReturn(payload: Record<string, unknown>) {
    const { data } = await httpClient.post(endpoints.sales.quickReturn, payload)
    return normalizeItemResponse<Record<string, unknown>>(data)
  },
}

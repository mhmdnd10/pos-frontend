import type { AxiosError } from 'axios'
import type { PaginationMeta } from '@/lib/types/api'

type AnyRecord = Record<string, unknown>

export interface ListResult<TData> {
  items: TData[]
  meta: PaginationMeta | null
}

function asRecord(value: unknown): AnyRecord | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as AnyRecord
  }

  return null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function readMeta(value: unknown): PaginationMeta | null {
  const source = asRecord(value)
  if (!source) {
    return null
  }

  const currentPage = asNumber(source.current_page)
  const lastPage = asNumber(source.last_page)
  const perPage = asNumber(source.per_page)
  const total = asNumber(source.total)

  if (currentPage && lastPage && perPage && total !== null) {
    return {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total,
    }
  }

  return null
}

export function normalizeListResponse<TData>(payload: unknown): ListResult<TData> {
  if (Array.isArray(payload)) {
    return {
      items: payload as TData[],
      meta: null,
    }
  }

  const root = asRecord(payload)
  if (!root) {
    return { items: [], meta: null }
  }

  if (Array.isArray(root.data)) {
    const meta = readMeta(root) ?? readMeta(root.meta)
    return {
      items: root.data as TData[],
      meta,
    }
  }

  const nestedData = asRecord(root.data)
  if (nestedData && Array.isArray(nestedData.data)) {
    const meta = readMeta(nestedData) ?? readMeta(nestedData.meta) ?? readMeta(root.meta)
    return {
      items: nestedData.data as TData[],
      meta,
    }
  }

  return { items: [], meta: null }
}

export function normalizeItemResponse<TData>(payload: unknown): TData {
  const root = asRecord(payload)

  if (!root) {
    return payload as TData
  }

  if (root.data !== undefined && !Array.isArray(root.data)) {
    return root.data as TData
  }

  return payload as TData
}

export function getApiErrorMessage(error: unknown, fallback = 'Request failed. Please try again.') {
  const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>
  const message = axiosError.response?.data?.message

  if (typeof message === 'string' && message.trim().length > 0) {
    return message
  }

  const errors = axiosError.response?.data?.errors
  if (errors) {
    const firstField = Object.keys(errors)[0]
    const firstMessage = firstField ? errors[firstField]?.[0] : null
    if (firstMessage) {
      return firstMessage
    }
  }

  return fallback
}

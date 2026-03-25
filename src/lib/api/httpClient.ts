import axios, { AxiosError } from 'axios'
import { clearAuthSession, getAuthToken } from '@/lib/api/session'

type UnauthorizedHandler = () => void
const FALLBACK_API_BASE_URL = 'http://127.0.0.1:8000'

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!configuredBaseUrl) {
    if (import.meta.env.DEV) {
      console.warn('[API] VITE_API_BASE_URL is missing. Falling back to http://127.0.0.1:8000')
    }

    return FALLBACK_API_BASE_URL
  }

  return configuredBaseUrl.replace(/\/+$/, '')
}

let unauthorizedHandler: UnauthorizedHandler = () => {
  window.location.assign('/login')
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

export const httpClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    Accept: 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const baseUrl = config.baseURL ?? ''
  const requestUrl = config.url ?? ''

  if (baseUrl.endsWith('/api') && requestUrl.startsWith('/api/')) {
    config.url = requestUrl.replace('/api/', '/')
  }

  const token = getAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      clearAuthSession()
      unauthorizedHandler()
    }

    return Promise.reject(error)
  },
)
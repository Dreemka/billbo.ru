import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import type { AuthTokensResponse } from '../../entities/types'
import {
  clearAuthCookies,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  getRoleFromCookie,
  setAuthCookies,
} from '../lib/authCookies'
import { mapBackendRoleToAppRole } from '../lib/mapBackendRole'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
})

export const TOKEN_KEY = 'billbo_access_token'
export const ROLE_KEY = 'billbo_role'
export const REFRESH_KEY = 'billbo_refresh_token'

const rawAuthClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
})

let refreshPromise: Promise<string | null> | null = null

type RefreshHandler = (data: AuthTokensResponse) => void
let onTokensRefreshed: RefreshHandler | null = null

export function setAuthTokenRefreshHandler(handler: RefreshHandler | null) {
  onTokensRefreshed = handler
}

/** Сохраняет токены в cookie (24 ч) и убирает устаревший localStorage. */
export function persistAuth(access: string, refresh: string | null, appRole: string) {
  if (typeof window === 'undefined') return
  setAuthCookies(access, refresh, appRole)
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(ROLE_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return getRefreshTokenFromCookie() ?? window.localStorage.getItem(REFRESH_KEY)
}

export function migrateLegacyAuthToCookies() {
  if (typeof window === 'undefined') return
  if (getAccessTokenFromCookie()) return
  const a = window.localStorage.getItem(TOKEN_KEY)
  const r = window.localStorage.getItem(REFRESH_KEY)
  const ro = window.localStorage.getItem(ROLE_KEY)
  if (a && ro && (ro === 'admin' || ro === 'user' || ro === 'superadmin')) {
    persistAuth(a, r ?? null, ro)
  }
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return
  clearAuthCookies()
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(ROLE_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
}

function getAccessTokenForRequest(): string | null {
  if (typeof window === 'undefined') return null
  return getAccessTokenFromCookie() ?? window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredAccessToken(): string | null {
  return getAccessTokenForRequest()
}

export function getStoredRole(): string | null {
  if (typeof window === 'undefined') return null
  return getRoleFromCookie() ?? window.localStorage.getItem(ROLE_KEY)
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const rt = getRefreshToken()
      if (!rt) return null
      const { data } = await rawAuthClient.post<AuthTokensResponse>('/auth/refresh', { refreshToken: rt })
      const appRole = mapBackendRoleToAppRole(data.role)
      persistAuth(data.accessToken, data.refreshToken, appRole)
      onTokensRefreshed?.(data)
      return data.accessToken
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

http.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config
  }

  const token = getAccessTokenForRequest()
  if (!token) {
    return config
  }

  const headers = config.headers ? new AxiosHeaders(config.headers) : new AxiosHeaders()
  headers.set('Authorization', `Bearer ${token}`)
  config.headers = headers
  return config
})

http.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const url = String(config?.url ?? '')

    if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (config._retry) {
      clearAuthStorage()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
      return Promise.reject(error)
    }

    const newAccess = await tryRefreshAccessToken()
    if (!newAccess) {
      clearAuthStorage()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
      return Promise.reject(error)
    }

    config._retry = true
    const headers = config.headers ? new AxiosHeaders(config.headers) : new AxiosHeaders()
    headers.set('Authorization', `Bearer ${newAccess}`)
    config.headers = headers
    return http(config)
  },
)

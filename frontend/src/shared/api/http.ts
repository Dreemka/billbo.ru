import axios, { AxiosHeaders } from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
})

const TOKEN_KEY = 'billbo_access_token'
const ROLE_KEY = 'billbo_role'
const REFRESH_KEY = 'billbo_refresh_token'

function clearAuthStorage() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(ROLE_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
}

http.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config
  }

  const token = window.localStorage.getItem(TOKEN_KEY)
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
  (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }
    const url = String(error.config?.url ?? '')
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return Promise.reject(error)
    }
    clearAuthStorage()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

export { clearAuthStorage, TOKEN_KEY, ROLE_KEY, REFRESH_KEY }

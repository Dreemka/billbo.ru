import axios, { AxiosHeaders } from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 5000,
})

const TOKEN_KEY = 'billbo_access_token'

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

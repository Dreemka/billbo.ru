/** Срок жизни cookie с токенами: 24 часа (секунды). */
export const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24

const NAMES = {
  access: 'billbo_access_token',
  refresh: 'billbo_refresh_token',
  role: 'billbo_role',
} as const

function cookieBase(): string {
  if (typeof window === 'undefined') return 'path=/'
  const secure = window.location.protocol === 'https:'
  return `path=/; max-age=${AUTH_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure ? '; Secure' : ''}`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

export function getAccessTokenFromCookie(): string | null {
  return getCookie(NAMES.access)
}

export function getRefreshTokenFromCookie(): string | null {
  return getCookie(NAMES.refresh)
}

export function getRoleFromCookie(): string | null {
  return getCookie(NAMES.role)
}

export function setAuthCookies(access: string, refresh: string | null, role: string): void {
  if (typeof document === 'undefined') return
  const base = cookieBase()
  document.cookie = `${NAMES.access}=${encodeURIComponent(access)}; ${base}`
  document.cookie = `${NAMES.role}=${encodeURIComponent(role)}; ${base}`
  if (refresh) {
    document.cookie = `${NAMES.refresh}=${encodeURIComponent(refresh)}; ${base}`
  } else {
    document.cookie = `${NAMES.refresh}=; path=/; max-age=0`
  }
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return
  const expire = 'path=/; max-age=0'
  document.cookie = `${NAMES.access}=; ${expire}`
  document.cookie = `${NAMES.refresh}=; ${expire}`
  document.cookie = `${NAMES.role}=; ${expire}`
}

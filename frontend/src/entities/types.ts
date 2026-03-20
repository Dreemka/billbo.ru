export type Role = 'guest' | 'admin' | 'user'

export interface CompanyProfile {
  name: string
  city: string
  description: string
}

export interface Billboard {
  id: string
  title: string
  type: 'billboard' | 'cityboard' | 'supersite' | 'digital'
  address: string
  lat: number
  lng: number
  pricePerWeek: number
  size: string
  available: boolean
  extraFields?: Record<string, unknown> | null
}

export interface UserProfile {
  fullName: string
  email: string
  phone: string
  avatarUrl?: string
}

export interface ChangePasswordPayload {
  newPassword: string
  repeatPassword: string
}

/** Ответ POST /auth/login и /auth/register */
export interface AuthTokensResponse {
  accessToken: string
  refreshToken: string
  role: string
}

/** Старый dev-эндпоинт login-as */
export interface AuthDevResponse {
  token: string
  role: Exclude<Role, 'guest'>
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
  phone?: string
  /** Prisma Role */
  role: 'USER' | 'COMPANY'
}

export interface WalletTopUpPayload {
  amount: number
}

export interface BookingPayload {
  billboardId: string
}

export interface FavoritesIdsResponse {
  ids: string[]
}

export interface FavoritesToggleResponse {
  favorited: boolean
}

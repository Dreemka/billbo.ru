export type Role = 'guest' | 'admin' | 'user' | 'superadmin'

export interface CompanyProfile {
  name: string
  city: string
  description: string
}

export interface Billboard {
  id: string
  title: string
  /** Текстовое описание конструкции (основной блок карточки). */
  description?: string
  type: 'billboard' | 'cityboard' | 'supersite' | 'digital'
  address: string
  lat: number
  lng: number
  pricePerWeek: number
  size: string
  available: boolean
  /** Владелец конструкции (из бэка, для маркетплейса и карты). */
  companyId?: string
  companyName?: string
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
  phone: string
  /** Prisma Role */
  role: 'USER' | 'COMPANY'
  /** Обязательны при role === COMPANY */
  companyName?: string
  companyCity?: string
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

/** Ответ GET /superadmin/users/companies */
export interface SuperadminCompanyAccountRow {
  id: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
  updatedAt: string
  company: {
    id: string
    name: string
    city: string
    description: string | null
    isVerified: boolean
    createdAt: string
    updatedAt: string
  } | null
}

/** Ответ GET /superadmin/users/clients */
export interface SuperadminClientAccountRow {
  id: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
  updatedAt: string
  wallet: { id: string; balance: number; createdAt: string; updatedAt: string } | null
  _count: { favorites: number; bookings: number }
}

/** POST /superadmin/users */
export interface SuperadminCreateUserPayload {
  email: string
  password: string
  fullName: string
  phone: string
  role: 'USER' | 'COMPANY' | 'SUPERADMIN'
  avatarUrl?: string
  companyName?: string
  companyCity?: string
  companyDescription?: string
  companyIsVerified?: boolean
}

export interface SuperadminCreateUserResponse {
  id: string
  email: string
  fullName: string
  role: string
}

/** PUT /superadmin/users/:id */
export interface SuperadminUpdateUserPayload {
  email: string
  fullName: string
  phone: string
  role: 'USER' | 'COMPANY' | 'SUPERADMIN'
  avatarUrl?: string
  password?: string
  companyName?: string
  companyCity?: string
  companyDescription?: string
  companyIsVerified?: boolean
}

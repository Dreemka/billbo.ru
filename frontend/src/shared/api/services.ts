import type {
  AuthDevResponse,
  AuthTokensResponse,
  Billboard,
  BookingPayload,
  CompanyProfile,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  Role,
  UserProfile,
  FavoritesIdsResponse,
  FavoritesToggleResponse,
  WalletTopUpPayload,
} from '../../entities/types'
import { http } from './http'

export const authApi = {
  login(payload: LoginPayload) {
    return http.post<AuthTokensResponse>('/auth/login', payload)
  },
  register(payload: RegisterPayload) {
    return http.post<AuthTokensResponse>('/auth/register', payload)
  },
  /** Только для локальной разработки, если задан VITE_ENABLE_DEV_LOGIN */
  loginAs(role: Exclude<Role, 'guest'>) {
    return http.post<AuthDevResponse>('/auth/login-as', { role })
  },
}

export const companyApi = {
  updateProfile(payload: CompanyProfile) {
    return http.put<CompanyProfile>('/company/profile', payload)
  },
  getProfile() {
    return http.get<CompanyProfile>('/company/profile')
  },
}

export const billboardsApi = {
  list() {
    return http.get<Billboard[]>('/billboards')
  },
  create(payload: Omit<Billboard, 'id'>) {
    return http.post<Billboard>('/billboards', payload)
  },
  bulkCreate(surfaces: Omit<Billboard, 'id'>[]) {
    return http.post<{ success: boolean; created: number }>(`/billboards/bulk`, { surfaces })
  },
  update(id: string, payload: Omit<Billboard, 'id'>) {
    return http.put<Billboard>(`/billboards/${id}`, payload)
  },
  remove(id: string) {
    return http.delete<void>(`/billboards/${id}`)
  },
}

export const userApi = {
  updateProfile(payload: UserProfile) {
    return http.put<UserProfile>('/user/profile', payload)
  },
  changePassword(payload: ChangePasswordPayload) {
    return http.put<{ success: boolean }>('/user/password', payload)
  },
  getProfile() {
    return http.get<UserProfile>('/user/profile')
  },
  getWallet() {
    return http.get<{ balance: number }>('/wallet/me')
  },
  topUp(payload: WalletTopUpPayload) {
    return http.post<{ balance: number }>('/wallet/top-up', payload)
  },
}

export const favoritesApi = {
  getIds() {
    return http.get<FavoritesIdsResponse>('/favorites')
  },
  toggle(billboardId: string) {
    return http.post<FavoritesToggleResponse>('/favorites/toggle', { billboardId })
  },
}

export const bookingApi = {
  create(payload: BookingPayload) {
    return http.post<{ success: boolean }>('/bookings', payload)
  },
}

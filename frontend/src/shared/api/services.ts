import type {
  AuthDevResponse,
  AuthTokensResponse,
  Billboard,
  BookingPayload,
  CompanyBookingClientRow,
  CompanyProfile,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  Role,
  UserProfile,
  FavoritesIdsResponse,
  FavoritesToggleResponse,
  WalletTopUpPayload,
  SuperadminCompanyAccountRow,
  SuperadminClientAccountRow,
  SuperadminCreateUserPayload,
  SuperadminCreateUserResponse,
  SuperadminUpdateUserPayload,
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
  listBookingClients() {
    return http.get<CompanyBookingClientRow[]>('/company/clients')
  },
}

export const billboardsApi = {
  list() {
    return http.get<Billboard[]>('/billboards')
  },
  /** Только конструкции своей компании (роль COMPANY; SUPERADMIN — полный список). */
  listMine() {
    return http.get<Billboard[]>('/billboards/mine')
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
  listMine() {
    return http.get<{ billboardIds: string[] }>('/bookings/mine')
  },
  cancel(payload: BookingPayload) {
    return http.post<{ success: boolean }>('/bookings/cancel', payload)
  },
}

export const superadminApi = {
  createUser(payload: SuperadminCreateUserPayload) {
    return http.post<SuperadminCreateUserResponse>('/superadmin/users', payload)
  },
  updateUser(id: string, payload: SuperadminUpdateUserPayload) {
    return http.put<{ success: boolean }>(`/superadmin/users/${id}`, payload)
  },
  listCompanies() {
    return http.get<SuperadminCompanyAccountRow[]>('/superadmin/users/companies')
  },
  listClients() {
    return http.get<SuperadminClientAccountRow[]>('/superadmin/users/clients')
  },
  listSuperadmins() {
    return http.get<SuperadminClientAccountRow[]>('/superadmin/users/superadmins')
  },
  listCompanyCatalogOptions() {
    return http.get<{ id: string; name: string; city: string }[]>('/superadmin/companies/options')
  },
}

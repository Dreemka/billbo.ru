import type {
  AuthResponse,
  Billboard,
  BookingPayload,
  CompanyProfile,
  Role,
  UserProfile,
  WalletTopUpPayload,
} from '../../entities/types'
import { http } from './http'

export const authApi = {
  loginAs(role: Exclude<Role, 'guest'>) {
    return http.post<AuthResponse>('/auth/login-as', { role })
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

export const bookingApi = {
  create(payload: BookingPayload) {
    return http.post<{ success: boolean }>('/bookings', payload)
  },
}

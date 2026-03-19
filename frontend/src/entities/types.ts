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
}

export interface UserProfile {
  fullName: string
  email: string
  phone: string
}

export interface AuthResponse {
  token: string
  role: Exclude<Role, 'guest'>
}

export interface WalletTopUpPayload {
  amount: number
}

export interface BookingPayload {
  billboardId: string
}

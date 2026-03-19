import { createContext, useContext } from 'react'
import { makeAutoObservable } from 'mobx'
import type { Billboard, CompanyProfile, Role, UserProfile } from '../../entities/types'
import { authApi, billboardsApi, bookingApi, companyApi, userApi } from '../../shared/api/services'

class SessionStore {
  role: Role = 'guest'
  token: string | null = null
  isLoading = false

  constructor() {
    makeAutoObservable(this)

    if (typeof window !== 'undefined') {
      const storedToken = window.localStorage.getItem('billbo_access_token')
      const storedRole = window.localStorage.getItem('billbo_role')
      if (storedToken && storedRole) {
        // Stored role is expected to be one of 'admin' | 'user'.
        this.token = storedToken
        if (storedRole === 'admin' || storedRole === 'user') {
          this.role = storedRole
        }
      }
    }
  }

  async loginAs(role: Exclude<Role, 'guest'>) {
    this.isLoading = true
    try {
      const response = await authApi.loginAs(role)
      this.role = response.data.role
      this.token = response.data.token

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('billbo_access_token', response.data.token)
        window.localStorage.setItem('billbo_role', response.data.role)
      }
    } catch {
      // Fallback for local development without backend.
      this.role = role
      this.token = 'local-dev-token'

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('billbo_access_token', 'local-dev-token')
        window.localStorage.setItem('billbo_role', role)
      }
    } finally {
      this.isLoading = false
    }
  }

  logout() {
    this.role = 'guest'
    this.token = null

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('billbo_access_token')
      window.localStorage.removeItem('billbo_role')
    }
  }
}

class CompanyStore {
  profile: CompanyProfile = { name: '', city: '', description: '' }
  isSaving = false
  isLoading = false
  lastError: string | null = null
  isProfileLoaded = false

  constructor() {
    makeAutoObservable(this)
  }

  async updateProfile(next: CompanyProfile) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await companyApi.updateProfile(next)
      this.profile = response.data
    } catch (error) {
      console.error('Company updateProfile failed', error)
      this.lastError = 'Не удалось сохранить профиль компании. Проверьте backend и БД.'
      this.profile = next
    } finally {
      this.isSaving = false
    }
  }

  async loadProfile() {
    if (this.isProfileLoaded || this.isLoading) {
      return
    }
    this.isLoading = true
    this.lastError = null
    try {
      const response = await companyApi.getProfile()
      this.profile = response.data
      this.isProfileLoaded = true
    } catch (error) {
      console.error('Company loadProfile failed', error)
      this.lastError = 'Не удалось загрузить профиль компании.'
    } finally {
      this.isLoading = false
    }
  }
}

class BillboardsStore {
  items: Billboard[] = []
  isLoading = false
  isSaving = false
  lastError: string | null = null
  isLoaded = false

  constructor() {
    makeAutoObservable(this)
  }

  async load() {
    if (this.isLoaded || this.isLoading) {
      return
    }
    this.isLoading = true
    this.lastError = null
    try {
      const response = await billboardsApi.list()
      this.items = response.data
      this.isLoaded = true
    } catch (error) {
      console.error('Billboards load failed', error)
      this.lastError = 'Не удалось загрузить список конструкций.'
      this.items = []
    } finally {
      this.isLoading = false
    }
  }

  async add(payload: Omit<Billboard, 'id'>) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await billboardsApi.create(payload)
      this.items.unshift(response.data)
    } catch (error) {
      console.error('Billboards add failed', error)
      this.lastError = 'Не удалось добавить конструкцию.'
      // keep existing items
    } finally {
      this.isSaving = false
    }
  }

  async update(id: string, payload: Omit<Billboard, 'id'>) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await billboardsApi.update(id, payload)
      this.items = this.items.map((item) => (item.id === id ? response.data : item))
    } catch (error) {
      console.error('Billboards update failed', error)
      this.lastError = 'Не удалось обновить конструкцию.'
    } finally {
      this.isSaving = false
    }
  }

  async remove(id: string) {
    this.isSaving = true
    this.lastError = null
    try {
      await billboardsApi.remove(id)
    } catch (error) {
      console.error('Billboards remove failed', error)
      this.lastError = 'Не удалось удалить конструкцию.'
    } finally {
      this.items = this.items.filter((item) => item.id !== id)
      this.isSaving = false
    }
  }

  async reserve(id: string) {
    this.lastError = null
    try {
      await bookingApi.create({ billboardId: id })
    } catch (error) {
      console.error('Billboards reserve failed', error)
      this.lastError = 'Не удалось выполнить бронирование.'
    } finally {
      this.items = this.items.map((item) => (item.id === id ? { ...item, available: false } : item))
    }
  }
}

class UserStore {
  profile: UserProfile = { fullName: '', email: '', phone: '' }
  walletBalance = 0
  isSaving = false
  isLoading = false
  lastError: string | null = null
  isProfileLoaded = false
  isWalletLoaded = false

  constructor() {
    makeAutoObservable(this)
  }

  async updateProfile(next: UserProfile) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await userApi.updateProfile(next)
      this.profile = response.data
    } catch (error) {
      console.error('User updateProfile failed', error)
      this.lastError = 'Не удалось сохранить профиль пользователя.'
    } finally {
      this.isSaving = false
    }
  }

  async topUp(amount: number) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await userApi.topUp({ amount })
      this.walletBalance = response.data.balance
    } catch (error) {
      console.error('User topUp failed', error)
      this.lastError = 'Не удалось пополнить кошелек.'
    } finally {
      this.isSaving = false
    }
  }

  async loadProfile() {
    if (this.isProfileLoaded || this.isLoading) {
      return
    }
    this.isLoading = true
    this.lastError = null
    try {
      const response = await userApi.getProfile()
      this.profile = response.data
      this.isProfileLoaded = true
    } catch (error) {
      console.error('User loadProfile failed', error)
      this.lastError = 'Не удалось загрузить профиль пользователя.'
    } finally {
      this.isLoading = false
    }
  }

  async loadWallet() {
    if (this.isWalletLoaded || this.isLoading) {
      return
    }
    this.isLoading = true
    this.lastError = null
    try {
      const response = await userApi.getWallet()
      this.walletBalance = response.data.balance
      this.isWalletLoaded = true
    } catch (error) {
      console.error('User loadWallet failed', error)
      this.lastError = 'Не удалось загрузить кошелек.'
    } finally {
      this.isLoading = false
    }
  }

  pay(amount: number): boolean {
    if (this.walletBalance < amount) {
      return false
    }
    this.walletBalance -= amount
    return true
  }
}

class RootStore {
  session = new SessionStore()
  company = new CompanyStore()
  billboards = new BillboardsStore()
  user = new UserStore()
}

export const rootStore = new RootStore()
export const RootStoreContext = createContext(rootStore)

export function useStore() {
  return useContext(RootStoreContext)
}

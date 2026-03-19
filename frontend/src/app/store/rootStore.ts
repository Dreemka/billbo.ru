import { createContext, useContext } from 'react'
import { makeAutoObservable } from 'mobx'
import type {
  AuthDevResponse,
  AuthTokensResponse,
  Billboard,
  CompanyProfile,
  RegisterPayload,
  Role,
  UserProfile,
} from '../../entities/types'
import { clearAuthStorage, REFRESH_KEY, ROLE_KEY, TOKEN_KEY } from '../../shared/api/http'
import { authApi, billboardsApi, bookingApi, companyApi, userApi } from '../../shared/api/services'
import { mapBackendRoleToAppRole } from '../../shared/lib/mapBackendRole'

class SessionStore {
  role: Role = 'guest'
  token: string | null = null
  isLoading = false
  authError: string | null = null

  constructor(private readonly onLogout?: () => void) {
    makeAutoObservable(this)

    if (typeof window !== 'undefined') {
      const storedToken = window.localStorage.getItem(TOKEN_KEY)
      const storedRole = window.localStorage.getItem(ROLE_KEY)
      if (storedToken && storedRole && (storedRole === 'admin' || storedRole === 'user')) {
        this.token = storedToken
        this.role = storedRole
      }
    }
  }

  private isAuthTokensResponse(data: unknown): data is AuthTokensResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      'accessToken' in data &&
      typeof (data as AuthTokensResponse).accessToken === 'string' &&
      'refreshToken' in data &&
      typeof (data as AuthTokensResponse).refreshToken === 'string' &&
      'role' in data &&
      typeof (data as AuthTokensResponse).role === 'string'
    )
  }

  private persistFromTokens(data: AuthTokensResponse) {
    const appRole = mapBackendRoleToAppRole(data.role)
    this.token = data.accessToken
    this.role = appRole
    this.authError = null
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, data.accessToken)
      window.localStorage.setItem(ROLE_KEY, appRole)
      window.localStorage.setItem(REFRESH_KEY, data.refreshToken)
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    this.isLoading = true
    this.authError = null
    try {
      const { data } = await authApi.login({ email, password })
      this.persistFromTokens(data)
      return true
    } catch {
      this.authError = 'Неверный email или пароль'
      return false
    } finally {
      this.isLoading = false
    }
  }

  async register(payload: RegisterPayload): Promise<boolean> {
    this.isLoading = true
    this.authError = null
    try {
      const { data } = await authApi.register(payload)
      this.persistFromTokens(data)
      return true
    } catch {
      this.authError = 'Не удалось зарегистрироваться. Возможно, email уже занят.'
      return false
    } finally {
      this.isLoading = false
    }
  }

  /** Только если в .env включён VITE_ENABLE_DEV_LOGIN=true */
  async loginAs(role: Exclude<Role, 'guest'>): Promise<boolean> {
    this.isLoading = true
    this.authError = null
    try {
      const { data } = await authApi.loginAs(role)
      if (this.isAuthTokensResponse(data)) {
        this.persistFromTokens(data)
      } else {
        const dev = data as AuthDevResponse
        this.token = dev.token
        this.role = dev.role
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(TOKEN_KEY, dev.token)
          window.localStorage.setItem(ROLE_KEY, dev.role)
        }
      }
      return true
    } catch {
      this.authError = 'Dev-вход недоступен'
      return false
    } finally {
      this.isLoading = false
    }
  }

  logout() {
    this.role = 'guest'
    this.token = null
    this.authError = null
    clearAuthStorage()
    this.onLogout?.()
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

  async reload() {
    this.isLoaded = false
    await this.load()
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

  async bulkImport(surfaces: Omit<Billboard, 'id'>[]) {
    this.isSaving = true
    this.lastError = null
    try {
      await billboardsApi.bulkCreate(surfaces)
      await this.reload()
    } catch (error) {
      console.error('Billboards bulkImport failed', error)
      this.lastError = 'Не удалось импортировать CSV.'
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
  company = new CompanyStore()
  billboards = new BillboardsStore()
  user = new UserStore()
  session: SessionStore

  constructor() {
    this.session = new SessionStore(() => {
      this.company.isProfileLoaded = false
      this.user.isProfileLoaded = false
      this.user.isWalletLoaded = false
      this.billboards.isLoaded = false
      this.company.lastError = null
      this.user.lastError = null
      this.billboards.lastError = null
    })
  }
}

export const rootStore = new RootStore()
export const RootStoreContext = createContext(rootStore)

export function useStore() {
  return useContext(RootStoreContext)
}

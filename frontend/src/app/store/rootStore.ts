import { createContext, useContext } from 'react'
import { makeAutoObservable, runInAction } from 'mobx'
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
import { getErrorMessage } from '../../shared/lib/getErrorMessage'

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
      runInAction(() => {
        this.profile = response.data
      })
    } catch (error) {
      console.error('Company updateProfile failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось сохранить профиль компании.')
        this.profile = next
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
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
      runInAction(() => {
        this.profile = response.data
        this.isProfileLoaded = true
      })
    } catch (error) {
      console.error('Company loadProfile failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось загрузить профиль компании.')
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}

export type BillboardsListSource = 'catalog' | 'mine'

class BillboardsStore {
  items: Billboard[] = []
  isLoading = false
  isSaving = false
  lastError: string | null = null
  isLoaded = false
  /** Откуда загружен список: весь каталог или только своя компания. */
  listSource: BillboardsListSource = 'catalog'

  constructor() {
    makeAutoObservable(this)
  }

  async load(source: BillboardsListSource = 'catalog') {
    const sourceChanged = this.listSource !== source
    this.listSource = source
    if (sourceChanged) {
      runInAction(() => {
        this.isLoaded = false
      })
    }
    if (this.isLoaded || this.isLoading) {
      return
    }
    this.isLoading = true
    this.lastError = null
    try {
      const response =
        source === 'mine' ? await billboardsApi.listMine() : await billboardsApi.list()
      runInAction(() => {
        this.items = response.data
        this.isLoaded = true
      })
    } catch (error) {
      console.error('Billboards load failed', error)
      runInAction(() => {
        this.lastError = 'Не удалось загрузить список конструкций.'
        this.items = []
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async reload() {
    this.isLoaded = false
    await this.load(this.listSource)
  }

  async add(payload: Omit<Billboard, 'id'>) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await billboardsApi.create(payload)
      runInAction(() => {
        // Новый массив — иначе React/useMemo с deps [items] не увидят unshift по той же ссылке (MobX).
        this.items = [response.data, ...this.items]
      })
    } catch (error) {
      console.error('Billboards add failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось добавить конструкцию.')
      })
      // keep existing items
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
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
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось импортировать CSV.')
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
    }
  }

  async update(id: string, payload: Omit<Billboard, 'id'>) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await billboardsApi.update(id, payload)
      runInAction(() => {
        this.items = this.items.map((item) => (item.id === id ? response.data : item))
      })
    } catch (error) {
      console.error('Billboards update failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось обновить конструкцию.')
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
    }
  }

  async remove(id: string) {
    this.isSaving = true
    this.lastError = null
    let ok = false
    try {
      await billboardsApi.remove(id)
      ok = true
    } catch (error) {
      console.error('Billboards remove failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось удалить конструкцию.')
      })
    } finally {
      runInAction(() => {
        if (ok) this.items = this.items.filter((item) => item.id !== id)
        this.isSaving = false
      })
    }
  }

  async reserve(id: string) {
    this.lastError = null
    let ok = false
    try {
      await bookingApi.create({ billboardId: id })
      ok = true
    } catch (error) {
      console.error('Billboards reserve failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось выполнить бронирование.')
      })
    } finally {
      runInAction(() => {
        if (ok) this.items = this.items.map((item) => (item.id === id ? { ...item, available: false } : item))
      })
    }
  }
}

class UserStore {
  profile: UserProfile = { fullName: '', email: '', phone: '', avatarUrl: undefined }
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
      runInAction(() => {
        this.profile = response.data
      })
    } catch (error) {
      console.error('User updateProfile failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось сохранить профиль пользователя.')
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
    }
  }

  async changePassword(newPassword: string, repeatPassword: string) {
    this.isSaving = true
    this.lastError = null
    try {
      await userApi.changePassword({ newPassword, repeatPassword })
    } catch (error) {
      console.error('User changePassword failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось изменить пароль.')
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
    }
  }

  async topUp(amount: number) {
    this.isSaving = true
    this.lastError = null
    try {
      const response = await userApi.topUp({ amount })
      runInAction(() => {
        this.walletBalance = response.data.balance
      })
    } catch (error) {
      console.error('User topUp failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось пополнить кошелек.')
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
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
      runInAction(() => {
        this.profile = response.data
        this.isProfileLoaded = true
      })
    } catch (error) {
      console.error('User loadProfile failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось загрузить профиль пользователя.')
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
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
      runInAction(() => {
        this.walletBalance = response.data.balance
        this.isWalletLoaded = true
      })
    } catch (error) {
      console.error('User loadWallet failed', error)
      runInAction(() => {
        this.lastError = getErrorMessage(error, 'Не удалось загрузить кошелек.')
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
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
      this.billboards.listSource = 'catalog'
      this.company.lastError = null
      this.user.lastError = null
      this.billboards.lastError = null
    })

    // Подгружаем профиль пользователя сразу при старте приложения (если пользователь уже залогинен)
    if (this.session.role !== 'guest' && this.session.token) {
      void this.user.loadProfile()
    }
  }
}

export const rootStore = new RootStore()
export const RootStoreContext = createContext(rootStore)

export function useStore() {
  return useContext(RootStoreContext)
}

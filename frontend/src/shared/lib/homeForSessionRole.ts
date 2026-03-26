import type { Role } from '../../entities/types'

/** Главная страница кабинета для текущей роли (после входа / при отказе в доступе). */
export function homeForSessionRole(r: Role): string {
  if (r === 'superadmin') return '/superadmin/superadmins'
  if (r === 'admin') return '/admin/company'
  if (r === 'user') return '/user/marketplace'
  return '/login'
}

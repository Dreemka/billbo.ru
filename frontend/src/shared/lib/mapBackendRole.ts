import type { Role } from '../../entities/types'

/** Роли из JWT / API (Prisma enum в виде строки). */
export function mapBackendRoleToAppRole(backendRole: string): Exclude<Role, 'guest'> {
  if (backendRole === 'SUPERADMIN') return 'superadmin'
  if (backendRole === 'USER') return 'user'
  if (backendRole === 'COMPANY') return 'admin'
  return 'user'
}

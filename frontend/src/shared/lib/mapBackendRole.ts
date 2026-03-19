import type { Role } from '../../entities/types'

/** Роли из JWT / API (Prisma enum в виде строки). */
export function mapBackendRoleToAppRole(backendRole: string): Exclude<Role, 'guest'> {
  if (backendRole === 'USER') return 'user'
  if (backendRole === 'COMPANY' || backendRole === 'SUPERADMIN') return 'admin'
  return 'user'
}

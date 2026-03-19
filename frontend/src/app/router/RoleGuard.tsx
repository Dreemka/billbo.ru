import { observer } from 'mobx-react-lite'
import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../../entities/types'
import { useStore } from '../store/rootStore'

interface RoleGuardProps {
  role: Exclude<Role, 'guest'>
  children: ReactElement
}

function homeForSessionRole(r: Role) {
  if (r === 'admin') return '/admin/company'
  if (r === 'user') return '/user/marketplace'
  return '/login'
}

export const RoleGuard = observer(function RoleGuard({ role, children }: RoleGuardProps) {
  const { session } = useStore()
  if (session.role === 'guest' || !session.token) {
    return <Navigate to="/login" replace />
  }
  if (session.role !== role) {
    return <Navigate to={homeForSessionRole(session.role)} replace />
  }
  return children
})

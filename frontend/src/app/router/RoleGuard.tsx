import { observer } from 'mobx-react-lite'
import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../../entities/types'
import { useStore } from '../store/rootStore'

interface RoleGuardProps {
  role: Exclude<Role, 'guest'>
  children: ReactElement
}

export const RoleGuard = observer(function RoleGuard({ role, children }: RoleGuardProps) {
  const { session } = useStore()
  if (session.role !== role) {
    return <Navigate to="/" replace />
  }
  return children
})

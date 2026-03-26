import { observer } from 'mobx-react-lite'
import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { homeForSessionRole } from '../../shared/lib/homeForSessionRole'
import { useStore } from '../store/rootStore'

interface SuperAdminGuardProps {
  children: ReactElement
}

export const SuperAdminGuard = observer(function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { session } = useStore()
  if (session.role === 'guest' || !session.token) {
    return <Navigate to="/login" replace />
  }
  if (session.role !== 'superadmin') {
    return <Navigate to={homeForSessionRole(session.role)} replace />
  }
  return children
})

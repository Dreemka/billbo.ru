import { observer } from 'mobx-react-lite'
import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/rootStore'

export const RequireAuth = observer(function RequireAuth({ children }: { children: ReactElement }) {
  const { session } = useStore()
  const location = useLocation()

  const isAuthed = session.role !== 'guest' && Boolean(session.token)

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
})

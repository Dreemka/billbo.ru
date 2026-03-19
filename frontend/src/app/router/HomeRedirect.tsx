import { observer } from 'mobx-react-lite'
import { Navigate } from 'react-router-dom'
import { useStore } from '../store/rootStore'

export const HomeRedirect = observer(function HomeRedirect() {
  const { session } = useStore()
  if (session.role === 'admin') {
    return <Navigate to="/admin/company" replace />
  }
  return <Navigate to="/user/marketplace" replace />
})

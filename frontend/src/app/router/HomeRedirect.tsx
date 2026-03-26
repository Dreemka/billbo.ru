import { observer } from 'mobx-react-lite'
import { Navigate } from 'react-router-dom'
import { homeForSessionRole } from '../../shared/lib/homeForSessionRole'
import { useStore } from '../store/rootStore'

export const HomeRedirect = observer(function HomeRedirect() {
  const { session } = useStore()
  return <Navigate to={homeForSessionRole(session.role)} replace />
})

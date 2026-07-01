import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function ProtectedRoute({ children, roles }) {
  const { token, roles: userRoles } = useAuthStore()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.some((r) => userRoles?.includes(r))) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

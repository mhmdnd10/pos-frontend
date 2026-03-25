import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { routePaths } from '@/app/router/routePaths'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={routePaths.login} replace state={{ from: location }} />
  }

  return <Outlet />
}
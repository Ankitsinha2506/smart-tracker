import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/FullPageLoader.jsx';
import { useAuth } from './AuthContext.jsx';

const homeFor = (user) => (['admin', 'staff'].includes(user.role) ? '/dashboard' : '/my-profile');

export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return user ? <Navigate to={homeFor(user)} replace /> : <Outlet />;
}

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

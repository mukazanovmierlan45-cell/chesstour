import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from './ui.jsx';

/** Защищённый маршрут: требует вход и (при необходимости) одну из ролей. */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <div className="container"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !hasRole(...roles)) {
    return <div className="container"><div className="card empty">Эта страница доступна только ролям: {roles.join(', ')}.</div></div>;
  }
  return children;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../components/common/Loader';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-loader"><Loader label="Opening your workspace" /></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

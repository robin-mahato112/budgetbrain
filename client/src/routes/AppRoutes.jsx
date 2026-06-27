import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import DemoBank from '../pages/DemoBank';
import MiniGuard from '../pages/MiniGuard';
import PaydaySetup from '../pages/PaydaySetup';
import ProtectedEssentials from '../pages/ProtectedEssentials';
import Transactions from '../pages/Transactions';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Settings from '../pages/Settings';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes({ shell: Shell }) {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="/connect-bank" element={<DemoBank />} />
          <Route path="/payday-setup" element={<PaydaySetup />} />
          <Route path="/protected-essentials" element={<ProtectedEssentials />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/mini-guard" element={<MiniGuard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

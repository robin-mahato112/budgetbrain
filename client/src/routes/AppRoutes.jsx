import { Navigate, Route, Routes } from 'react-router-dom';
import LegalPage from '../features/compliance/LegalPage';
import Dashboard from '../pages/Dashboard';
import BudgetTracker from '../pages/BudgetTracker';
import SavingsGoal from '../pages/SavingsGoal';
import DebtPayoff from '../pages/DebtPayoff';
import BillSplitter from '../pages/BillSplitter';
import ChatHistory from '../pages/ChatHistory';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Settings from '../pages/Settings';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes({ shell: Shell }) {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy" element={<LegalPage type="privacy" />} />
      <Route path="/terms" element={<LegalPage type="terms" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="/budget" element={<BudgetTracker />} />
          <Route path="/savings" element={<SavingsGoal />} />
          <Route path="/debt" element={<DebtPayoff />} />
          <Route path="/split" element={<BillSplitter />} />
          <Route path="/history" element={<ChatHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

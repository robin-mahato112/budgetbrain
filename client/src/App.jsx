import { useState } from 'react';
import { BrowserRouter, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopNavbar from './components/layout/TopNavbar';
import ComplianceGate from './features/compliance/ComplianceGate';
import AppRoutes from './routes/AppRoutes';

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <div className="app-main">
        <TopNavbar />
        <main className="app-content"><Outlet /></main>
      </div>
      <ComplianceGate />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes shell={AppShell} />
    </BrowserRouter>
  );
}

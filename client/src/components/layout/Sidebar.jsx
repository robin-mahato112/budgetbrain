import {
  BotMessageSquare,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  ReceiptText,
  Settings,
  WalletCards,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/budget', label: 'Budget Tracker', icon: WalletCards },
  { to: '/savings', label: 'Savings Goal', icon: PiggyBank },
  { to: '/debt', label: 'Debt Payoff', icon: CircleDollarSign },
  { to: '/split', label: 'Bill Splitter', icon: Calculator },
  { to: '/history', label: 'Chat History', icon: BotMessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose, onOpen }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <button className="mobile-menu-button" onClick={onOpen} aria-label="Open navigation"><Menu size={21} /></button>
      {open && <button className="sidebar-overlay" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark"><ChartNoAxesCombined size={21} /></div>
          <div><strong>BudgetBrain</strong><span>Finance workspace</span></div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <nav className="sidebar__nav">
          <p className="sidebar__label">Workspace</p>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__secure">
            <ReceiptText size={17} />
            <div><strong>Private workspace</strong><span>Your data stays protected</span></div>
          </div>
          <button className="sidebar__link sidebar__logout" onClick={handleLogout}>
            <LogOut size={19} /><span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

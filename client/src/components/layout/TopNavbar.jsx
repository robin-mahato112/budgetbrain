import { LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFinance } from '../../hooks/useFinance';

const titles = {
  '/': 'Dashboard',
  '/connect-bank': 'Connect Bank',
  '/payday-setup': 'Payday Setup',
  '/protected-essentials': 'Protected Essentials',
  '/transactions': 'Transactions',
  '/mini-guard': 'Mini Guard',
  '/settings': 'Settings',
};

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const { insights } = useFinance();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="top-navbar">
      <div className="top-navbar__heading">
        <span className="top-navbar__date">BudgetBrain</span>
        <strong>{titles[location.pathname] || 'Payday Guardrail'}</strong>
      </div>
      <div className="top-navbar__actions">
        <div className="sync-pill" aria-label="Sync status">
          <ShieldCheck size={16} />
          <span>{insights?.demoBank?.connected ? 'Demo Bank Connected' : 'No bank data connected'}</span>
          <strong>{insights?.confidence?.level || 'Not Ready'}</strong>
        </div>
        <div className="profile-menu" ref={menuRef}>
          <button className="profile-button" onClick={() => setOpen((value) => !value)} aria-label="Open account menu" aria-expanded={open}>
            <UserRound size={18} /><span>{user?.name || 'Profile'}</span>
          </button>
          {open && (
            <div className="profile-menu__panel" role="menu">
              <Link to="/settings#account" onClick={() => setOpen(false)} role="menuitem"><Settings size={16} />Account settings</Link>
              <Link to="/settings#account" onClick={() => setOpen(false)} role="menuitem">Profile</Link>
              <Link to="/settings#security" onClick={() => setOpen(false)} role="menuitem">Security</Link>
              <Link to="/settings#privacy" onClick={() => setOpen(false)} role="menuitem">Privacy</Link>
              <button type="button" onClick={handleLogout} role="menuitem"><LogOut size={16} />Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

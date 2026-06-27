import {
  Bell,
  CircleDollarSign,
  Moon,
  PiggyBank,
  Plus,
  Receipt,
  Sun,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFinance } from '../../hooks/useFinance';
import { useTheme } from '../../hooks/useTheme';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

export default function TopNavbar() {
  const { user } = useAuth();
  const { addTransaction, addSavingsGoal, debts } = useFinance();
  const { theme, toggleTheme } = useTheme();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const noticeTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const closeModal = () => { setModal(null); setForm({}); setFormError(''); };
  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2500);
  };

  const saveTransaction = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await addTransaction({ ...form, type: modal });
    if (!result.ok) {
      setFormError(result.message);
      setSaving(false);
      return;
    }
    closeModal();
    showNotice(`${modal === 'income' ? 'Income' : 'Expense'} added`);
    setSaving(false);
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await addSavingsGoal(form);
    if (!result.ok) {
      setFormError(result.message);
      setSaving(false);
      return;
    }
    closeModal();
    showNotice('Savings goal added');
    setSaving(false);
  };

  return (
    <>
      <header className="top-navbar">
        <div className="top-navbar__heading">
          <span className="top-navbar__date">Financial overview</span>
          <strong>Good to see you, {user?.name?.split(' ')[0] || 'there'}</strong>
        </div>
        <div className="top-navbar__actions">
          <Button variant="ghost" size="small" icon={Plus} onClick={() => setModal('income')}>Income</Button>
          <Button variant="ghost" size="small" icon={Receipt} onClick={() => setModal('expense')}>Expense</Button>
          <button className="icon-button" onClick={() => setModal('goal')} aria-label="Add savings goal"><PiggyBank size={19} /></button>
          <button className="icon-button icon-button--alert" onClick={() => showNotice(`${debts.length} debts are being tracked`)} aria-label="View debt alerts"><CircleDollarSign size={19} /></button>
          <button className="icon-button" onClick={() => showNotice('You have no new notifications')} aria-label="Notifications"><Bell size={19} /></button>
          <button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="profile-button" onClick={() => setModal('profile')} aria-label="Open profile">
            <UserRound size={18} /><span>{user?.name || 'Profile'}</span>
          </button>
        </div>
      </header>

      {notice && <div className="toast" role="status">{notice}</div>}

      <Modal open={modal === 'income' || modal === 'expense'} title={`Add ${modal || ''}`} onClose={closeModal}>
        <form className="stack-form" onSubmit={saveTransaction}>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <Input label="Description" name="merchant" required value={form.merchant || ''} onChange={(event) => setForm({ ...form, merchant: event.target.value })} />
          <Input label="Category" name="category" required value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <Input label="Amount" name="amount" type="number" min="0.01" step="0.01" required value={form.amount || ''} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save transaction'}</Button>
        </form>
      </Modal>

      <Modal open={modal === 'goal'} title="Create savings goal" onClose={closeModal}>
        <form className="stack-form" onSubmit={saveGoal}>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <Input label="Goal name" name="name" required value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Target amount" name="target" type="number" min="1" required value={form.target || ''} onChange={(event) => setForm({ ...form, target: event.target.value })} />
          <Input label="Current savings" name="current" type="number" min="0" value={form.current || ''} onChange={(event) => setForm({ ...form, current: event.target.value })} />
          <Input label="Target date" name="deadline" type="date" value={form.deadline || ''} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create goal'}</Button>
        </form>
      </Modal>

      <Modal open={modal === 'profile'} title="Profile" onClose={closeModal}>
        <div className="profile-summary">
          <div className="profile-summary__avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div><strong>{user?.name}</strong><span>{user?.email}</span></div>
        </div>
      </Modal>
    </>
  );
}

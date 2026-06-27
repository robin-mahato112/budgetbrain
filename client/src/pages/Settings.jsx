import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const downloadData = async () => {
    if (busyAction) return;
    setBusyAction('export');
    setStatus('');
    try {
      const data = await authService.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `budgetbrain-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Your data export has downloaded.');
    } catch {
      setStatus('Data export failed. Please try again.');
    } finally {
      setBusyAction('');
    }
  };

  const removeAccount = async () => {
    if (busyAction || !password.trim() || !window.confirm('Permanently delete your account and saved chats?')) return;
    setBusyAction('delete');
    setStatus('');
    try {
      await authService.deleteAccount(password);
      logout();
      navigate('/login');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Account deletion failed.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <PageContainer eyebrow="Account" title="Settings" description="Manage your profile, privacy, and application data.">
      <div className="settings-grid">
        <Card className="settings-card">
          <ShieldCheck size={22} />
          <div><h2>Profile and privacy</h2><p>{user?.name}<br />{user?.email}</p></div>
          <div className="inline-links"><Link to="/privacy">Privacy notice</Link><Link to="/terms">Terms of use</Link></div>
        </Card>
        <Card className="settings-card">
          <Download size={22} />
          <div><h2>Download your data</h2><p>Export your profile and complete conversation history.</p></div>
          <Button variant="secondary" disabled={Boolean(busyAction)} onClick={downloadData}>{busyAction === 'export' ? 'Preparing...' : 'Download data'}</Button>
        </Card>
        <Card className="settings-card settings-card--danger">
          <Trash2 size={22} />
          <div><h2>Delete account</h2><p>This permanently removes your account and saved chats.</p></div>
          <Input label="Confirm password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button variant="danger" disabled={!password.trim() || Boolean(busyAction)} onClick={removeAccount}>{busyAction === 'delete' ? 'Deleting...' : 'Delete account'}</Button>
        </Card>
      </div>
      {status && <p className="status-message" role="status">{status}</p>}
    </PageContainer>
  );
}

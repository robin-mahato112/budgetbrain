import { Download, KeyRound, Landmark, LogOut, ShieldCheck, Sparkles, Trash2, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useAuth } from '../hooks/useAuth';
import { useFinance } from '../hooks/useFinance';
import { authService } from '../services/authService';

const tabs = ['Account', 'Security', 'Payday', 'Demo Bank', 'Data & Privacy', 'AI Settings', 'Notifications'];

export default function Settings() {
  const { user, logout } = useAuth();
  const { disconnectDemoBank } = useFinance();
  const navigate = useNavigate();
  const [active, setActive] = useState(tabFromHash());
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', currentPassword: '', newPassword: '' });
  const [prefs, setPrefs] = useState({
    currency: 'AUD',
    paydayCadence: 'weekly',
    timezone: 'Australia/Sydney',
    weekStart: 'Monday',
    allowAiFinancialSummary: true,
    lowSafeAlert: true,
    recoveryAlert: true,
    paydayReminder: true,
    billDueReminder: true,
    dataOutdatedReminder: true,
    currentPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    authService.getPreferences().then((data) => setPrefs((current) => ({ ...current, ...data }))).catch(() => {});
    const onHash = () => setActive(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy('profile');
    setStatus('');
    try {
      await authService.updateProfile({
        name: profile.name,
        email: profile.email !== user?.email ? profile.email : undefined,
        newPassword: profile.newPassword || undefined,
        currentPassword: profile.currentPassword,
      });
      setStatus('Account settings updated.');
      setProfile((current) => ({ ...current, currentPassword: '', newPassword: '' }));
    } catch (error) {
      setStatus(error.response?.data?.message || 'Account update failed.');
    } finally {
      setBusy('');
    }
  };

  const savePrefs = async (event) => {
    event.preventDefault();
    setBusy('prefs');
    setStatus('');
    try {
      const next = await authService.updatePreferences(prefs);
      setPrefs((current) => ({ ...current, ...next, currentPassword: '' }));
      setStatus('Settings saved.');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Settings could not be saved.');
    } finally {
      setBusy('');
    }
  };

  const downloadData = async () => {
    setBusy('export');
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
      setBusy('');
    }
  };

  const removeAccount = async () => {
    if (!deletePassword.trim() || !window.confirm('Permanently delete your account and saved data?')) return;
    setBusy('delete');
    try {
      await authService.deleteAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Account deletion failed.');
      setBusy('');
    }
  };

  return (
    <PageContainer eyebrow="Account" title="Settings" description="Compact account, payday, demo bank, privacy, AI, and notification controls.">
      <div className="settings-tabs" role="tablist">
        {tabs.map((tab) => (
          <button key={tab} type="button" className={active === tab ? 'settings-tabs__active' : ''} onClick={() => setActive(tab)} role="tab" aria-selected={active === tab}>{tab}</button>
        ))}
      </div>

      {active === 'Account' && (
        <SettingsCard icon={UserCog} title="Account" text="Update profile details. Email and password changes require your current password.">
          <form className="settings-form" onSubmit={saveProfile}>
            <Input label="Name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} />
            <Input label="Email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} />
            <Input label="New password" type="password" value={profile.newPassword} onChange={(event) => setProfile((current) => ({ ...current, newPassword: event.target.value }))} />
            <Input label="Current password for sensitive changes" type="password" value={profile.currentPassword} onChange={(event) => setProfile((current) => ({ ...current, currentPassword: event.target.value }))} />
            <Button disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving...' : 'Save account'}</Button>
          </form>
        </SettingsCard>
      )}

      {active === 'Security' && (
        <SettingsCard icon={KeyRound} title="Security" text="Sensitive actions require your current password.">
          <form className="settings-form" onSubmit={savePrefs}>
            <Input label="Current password" type="password" value={prefs.currentPassword} onChange={(event) => setPrefs((current) => ({ ...current, currentPassword: event.target.value }))} />
            <Button disabled={busy === 'prefs'}>Save security settings</Button>
          </form>
          <Button type="button" variant="secondary" icon={LogOut} onClick={logout}>Logout current session</Button>
        </SettingsCard>
      )}

      {active === 'Payday' && (
        <SettingsCard icon={ShieldCheck} title="Payday Preferences" text="Defaults used by the payday guardrail experience.">
          <form className="settings-form" onSubmit={savePrefs}>
            <Input label="Default payday" value={prefs.defaultPayday || ''} onChange={(event) => setPrefs((current) => ({ ...current, defaultPayday: event.target.value }))} placeholder="Friday" />
            <label>Income frequency<select value={prefs.paydayCadence} onChange={(event) => setPrefs((current) => ({ ...current, paydayCadence: event.target.value }))}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></label>
            <label>Currency<select value={prefs.currency} onChange={(event) => setPrefs((current) => ({ ...current, currency: event.target.value }))}><option>AUD</option><option>USD</option><option>NZD</option></select></label>
            <Input label="Timezone" value={prefs.timezone} onChange={(event) => setPrefs((current) => ({ ...current, timezone: event.target.value }))} />
            <Input label="Week start day" value={prefs.weekStart} onChange={(event) => setPrefs((current) => ({ ...current, weekStart: event.target.value }))} />
            <Button disabled={busy === 'prefs'}>Save payday preferences</Button>
          </form>
        </SettingsCard>
      )}

      {active === 'Demo Bank' && (
        <SettingsCard icon={Landmark} title="Demo Bank" text="Demo data is for testing and portfolio demonstration only. No real bank account is connected.">
          <div className="settings-actions">
            <Button type="button" onClick={() => navigate('/connect-bank')}>Connect demo bank</Button>
            <Button type="button" variant="secondary" onClick={async () => { const result = await disconnectDemoBank(); setStatus(result.ok ? 'Demo bank data reset.' : result.message); }}>Reset demo data</Button>
          </div>
        </SettingsCard>
      )}

      {active === 'Data & Privacy' && (
        <SettingsCard icon={Trash2} title="Data & Privacy" text="Export data, clear financial data, delete uploaded documents, clear AI history, or delete account.">
          <div className="settings-actions">
            <Button variant="secondary" icon={Download} disabled={Boolean(busy)} onClick={downloadData}>{busy === 'export' ? 'Preparing...' : 'Export my data'}</Button>
            <Button variant="secondary" disabled>Clear financial data</Button>
            <Button variant="secondary" disabled>Delete uploaded documents</Button>
            <Button variant="secondary" disabled>Clear AI history</Button>
          </div>
          <Input label="Current password to delete account" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
          <Button variant="danger" disabled={!deletePassword.trim() || Boolean(busy)} onClick={removeAccount}>{busy === 'delete' ? 'Deleting...' : 'Delete account'}</Button>
        </SettingsCard>
      )}

      {active === 'AI Settings' && (
        <SettingsCard icon={Sparkles} title="AI Settings" text="AI explains backend results. It does not calculate financial truth or provide professional advice.">
          <form className="settings-form" onSubmit={savePrefs}>
            <label className="settings-toggle"><input type="checkbox" checked={prefs.allowAiFinancialSummary} onChange={(event) => setPrefs((current) => ({ ...current, allowAiFinancialSummary: event.target.checked }))} /> Enable AI explanations</label>
            <Input label="Current password for AI privacy changes" type="password" value={prefs.currentPassword} onChange={(event) => setPrefs((current) => ({ ...current, currentPassword: event.target.value }))} />
            <Button disabled={busy === 'prefs'}>Save AI settings</Button>
          </form>
          <p className="ai-summary-card__empty">AI explanations are educational only. BudgetBrain sends safe summaries, not passwords, API keys, JWT tokens, or raw documents.</p>
        </SettingsCard>
      )}

      {active === 'Notifications' && (
        <SettingsCard icon={ShieldCheck} title="Notifications" text="For now, alerts are in-app only.">
          <form className="settings-form" onSubmit={savePrefs}>
            {[
              ['lowSafeAlert', 'Low safe-to-spend alert'],
              ['recoveryAlert', 'Recovery Mode alert'],
              ['paydayReminder', 'Payday reminder'],
              ['billDueReminder', 'Bill due reminder'],
              ['dataOutdatedReminder', 'Data outdated reminder'],
            ].map(([key, label]) => (
              <label className="settings-toggle" key={key}><input type="checkbox" checked={Boolean(prefs[key])} onChange={(event) => setPrefs((current) => ({ ...current, [key]: event.target.checked }))} /> {label}</label>
            ))}
            <Button disabled={busy === 'prefs'}>Save notifications</Button>
          </form>
        </SettingsCard>
      )}

      {status && <p className="status-message" role="status">{status}</p>}
    </PageContainer>
  );
}

function SettingsCard({ icon: Icon, title, text, children }) {
  return (
    <Card className="settings-card settings-card--focused">
      <Icon size={22} />
      <div><h2>{title}</h2><p>{text}</p></div>
      {children}
    </Card>
  );
}

function tabFromHash() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'security') return 'Security';
  if (hash === 'privacy') return 'Data & Privacy';
  return 'Account';
}

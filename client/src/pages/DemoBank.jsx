import { FileSpreadsheet, Landmark, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import DemoBankPanel from '../components/dashboard/DemoBankPanel';
import PageContainer from '../components/layout/PageContainer';
import { budgetService } from '../services/budgetService';

export default function DemoBank() {
  const navigate = useNavigate();
  const [ynab, setYnab] = useState({ configured: false, connected: false, status: 'DISCONNECTED' });
  const [budgets, setBudgets] = useState([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const loadStatus = async () => {
    try {
      const status = await budgetService.getYnabStatus(); setYnab(status);
      if (status.connected && !status.selectedBudgetId) setBudgets(await budgetService.getYnabBudgets());
    } catch { setMessage('Financial source status could not be loaded. Existing data is still available.'); }
  };
  useEffect(() => { loadStatus(); }, []);

  const connect = async () => {
    setBusy('connect'); setMessage('');
    try { const result = await budgetService.startYnabConnection(); window.location.assign(result.authorizationUrl); }
    catch (error) { setMessage(error.response?.data?.message || 'YNAB is not configured for this installation.'); setBusy(''); }
  };
  const choose = async () => {
    if (!selected) return; setBusy('choose');
    try { const budget = budgets.find((item) => item.id === selected); await budgetService.selectYnabBudget(selected, budget?.name); await loadStatus(); setMessage('YNAB budget selected.'); }
    catch (error) { setMessage(error.response?.data?.message || 'Budget selection failed.'); }
    finally { setBusy(''); }
  };
  const sync = async () => {
    setBusy('sync');
    try { const result = await budgetService.syncYnab(); setMessage(`${result.created} created, ${result.updated} updated, ${result.removed} removed.`); await loadStatus(); }
    catch (error) { setMessage(error.response?.data?.message || 'YNAB could not sync. Previous transactions are still available.'); }
    finally { setBusy(''); }
  };
  const disconnect = async () => {
    if (!window.confirm('Disconnect YNAB? Imported transaction history will be kept.')) return;
    setBusy('disconnect');
    try { await budgetService.disconnectYnab(false); await loadStatus(); setMessage('YNAB disconnected. Imported history was kept.'); }
    catch (error) { setMessage(error.response?.data?.message || 'YNAB could not be disconnected.'); }
    finally { setBusy(''); }
  };

  return (
    <PageContainer eyebrow="Connections" title="Financial Sources" description="Connect information that improves your safe-to-spend estimate. BudgetBrain normalises every source before calculating the result.">
      {message && <p className="status-message" role="status">{message}</p>}
      <div className="source-grid">
        <div><DemoBankPanel /></div>
        <Card className="source-card">
          <WalletCards size={24} />
          <span className={`source-card__status ${ynab.connected ? 'source-card__status--connected' : ''}`}>{ynab.connected ? 'Connected' : ynab.configured ? 'Available' : 'Not configured'}</span>
          <h2>YNAB</h2>
          <p>Import accounts and transaction history through YNAB. Tokens remain encrypted on the server and are never sent to this browser.</p>
          {ynab.lastSyncedAt && <p>Last successful sync: {new Date(ynab.lastSyncedAt).toLocaleString('en-AU')}</p>}
          {ynab.lastError && <p role="alert">Last sync issue: {ynab.lastError}</p>}
          {budgets.length > 0 && !ynab.selectedBudgetId && <label>YNAB budget<select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Select a budget</option>{budgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.name}</option>)}</select></label>}
          <div className="source-card__actions">
            {!ynab.connected && <Button onClick={connect} disabled={!ynab.configured || busy === 'connect'}>{ynab.configured ? 'Connect YNAB' : 'Credentials required'}</Button>}
            {budgets.length > 0 && !ynab.selectedBudgetId && <Button onClick={choose} disabled={!selected || busy === 'choose'}>Use budget</Button>}
            {ynab.connected && ynab.selectedBudgetId && <Button onClick={sync} disabled={busy === 'sync'}>{busy === 'sync' ? 'Syncing...' : 'Sync now'}</Button>}
            {ynab.connected && <Button variant="secondary" onClick={disconnect} disabled={busy === 'disconnect'}>Disconnect</Button>}
          </div>
        </Card>
        <Card className="source-card">
          <FileSpreadsheet size={24} /><span className="source-card__status">File import</span><h2>Bank CSV</h2>
          <p>Upload transactions exported from your bank. Preview detected fields, map unfamiliar columns, and confirm before anything is saved.</p>
          <div className="source-card__actions"><Button onClick={() => navigate('/transactions')}>Import CSV</Button></div>
        </Card>
      </div>
      <Card className="source-card" style={{ marginTop: '.9rem', minHeight: 'auto' }}>
        <Landmark size={24} /><span className="source-card__status">Coming later</span><h2>Australian Open Banking</h2>
        <p>No Australian bank connection is currently available. BudgetBrain does not ask for or store bank login credentials.</p>
      </Card>
    </PageContainer>
  );
}

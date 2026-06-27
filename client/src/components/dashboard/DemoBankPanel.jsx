import { Landmark, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFinance } from '../../hooks/useFinance';
import { budgetService } from '../../services/budgetService';
import Button from '../common/Button';
import Card from '../common/Card';

export default function DemoBankPanel() {
  const { insights, connectDemoBank, disconnectDemoBank } = useFinance();
  const [scenarios, setScenarios] = useState([]);
  const [scenario, setScenario] = useState('freedom');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const connected = insights?.demoBank?.connected;

  useEffect(() => {
    let active = true;
    budgetService.getDemoScenarios()
      .then((items) => active && setScenarios(items))
      .catch(() => active && setError('Demo scenarios could not be loaded.'));
    return () => { active = false; };
  }, []);

  const sync = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    const result = await connectDemoBank(scenario);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatus(`${result.message} Last synced: ${formatSyncTime(result.lastSyncedAt)}.`);
  };

  const disconnect = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    const result = await disconnectDemoBank();
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatus('Demo bank disconnected. Sample transactions were removed.');
  };

  return (
    <Card className="demo-bank-card">
      <div className="card-heading">
        <div>
          <span className="card-heading__eyebrow">Demo Bank Connection</span>
          <h2>Build your Payday Guardrail</h2>
        </div>
        <Landmark size={20} />
      </div>
      <p>This is demo bank data for portfolio/testing only. No real bank account is connected.</p>
      <div className="demo-bank-controls">
        <label>
          Choose demo scenario
          <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
            {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <Button type="button" icon={RefreshCw} onClick={sync} disabled={loading}>
          {loading ? 'Syncing...' : connected ? 'Sync Demo Bank' : 'Connect Demo Bank'}
        </Button>
        {connected && (
          <Button type="button" variant="secondary" icon={Unplug} onClick={disconnect} disabled={loading}>
            Disconnect
          </Button>
        )}
      </div>
      {connected && (
        <div className="demo-bank-status" role="status">
          <strong>Demo Bank Connected</strong>
          <span>Last synced: {formatSyncTime(insights.demoBank.lastSyncedAt)}</span>
          <span>Confidence: {insights.confidence?.level || 'High'}</span>
        </div>
      )}
      {status && <p className="status-message" role="status">{status}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Card>
  );
}

function formatSyncTime(value) {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced yet';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

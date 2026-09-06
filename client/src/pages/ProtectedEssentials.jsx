import { ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';
import { budgetService } from '../services/budgetService';

const categories = ['HOUSING', 'GROCERIES', 'TRANSPORT', 'UTILITIES', 'INSURANCE', 'DEBT', 'SUBSCRIPTIONS', 'HEALTH', 'EDUCATION', 'REMITTANCE', 'OTHER_ESSENTIAL'];
const emptyForm = { name: '', amount: '', currency: 'AUD', frequency: 'WEEKLY', nextDueDate: '', category: 'HOUSING', classification: 'FIXED', enabled: true };

export default function ProtectedEssentials() {
  const { refreshTransactions, insights } = useFinance();
  const [costs, setCosts] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const [nextCosts, patterns] = await Promise.all([budgetService.getProtectedCosts(), budgetService.getRecurringPatterns()]);
    setCosts(nextCosts); setRecurring(patterns);
  };

  useEffect(() => { load().catch(() => setStatus('Protected costs could not be loaded.')); }, []);

  const save = async (event) => {
    event.preventDefault(); setLoading(true); setStatus('');
    try {
      if (editingId) await budgetService.updateProtectedCost(editingId, { ...form, amount: Number(form.amount) });
      else await budgetService.createProtectedCost({ ...form, amount: Number(form.amount) });
      await Promise.all([load(), refreshTransactions()]);
      setForm(emptyForm); setEditingId(null); setStatus(editingId ? 'Protected cost updated.' : 'Protected essential saved.');
    } catch (error) { setStatus(error.response?.data?.message || 'The protected cost could not be saved.'); }
    finally { setLoading(false); }
  };

  const edit = (cost) => {
    setEditingId(cost.id);
    setForm({ name: cost.name, amount: String(cost.originalAmount ?? cost.amount), currency: cost.currency, frequency: cost.frequency, nextDueDate: String(cost.nextDueDate).slice(0, 10), category: cost.category, classification: cost.classification, enabled: cost.enabled });
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this protected cost?')) return;
    await budgetService.deleteProtectedCost(id); await Promise.all([load(), refreshTransactions()]); setStatus('Protected cost deleted.');
  };
  const toggle = async (cost) => {
    await budgetService.updateProtectedCost(cost.id, { enabled: !cost.enabled }); await Promise.all([load(), refreshTransactions()]);
  };
  const reviewRecurring = async (id, protectionStatus) => {
    await budgetService.updateRecurringPattern(id, protectionStatus); await Promise.all([load(), refreshTransactions()]);
    setStatus(protectionStatus === 'PROTECTED' ? 'Recurring payment is now protected.' : 'Recurring payment ignored.');
  };

  return (
    <PageContainer eyebrow="Essentials" title="Protected Essentials" description="Protect rent, food, transport, bills, debt, and other essentials before anything is marked safe to spend.">
      <div className="settings-grid settings-grid--wide">
        <Card className="settings-card">
          <ShieldCheck size={22} /><div><h2>{editingId ? 'Edit protected item' : 'Add protected item'}</h2><p>Only enabled fixed and adjustable essentials reduce safe-to-spend.</p></div>
          <form className="settings-form" onSubmit={save}>
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rent" />
            <Input label="Amount" required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="300" />
            <label>Currency<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{['AUD', 'USD', 'NZD', 'NPR', 'EUR', 'GBP'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Frequency<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{['ONE_TIME', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((value) => <option key={value}>{value.replace('_', ' ')}</option>)}</select></label>
            <Input label="Next due date" required type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
            <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
            <label>Classification<select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}><option value="FIXED">Fixed</option><option value="ADJUSTABLE_ESSENTIAL">Adjustable essential</option><option value="OPTIONAL">Optional</option></select></label>
            <Button type="submit" disabled={loading}>{editingId ? 'Update protected cost' : 'Save protected essential'}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</Button>}
          </form>
        </Card>
        <Card className="settings-card">
          <ShieldCheck size={22} /><div><h2>Protected costs</h2><p>Changes are saved and recalculate the dashboard immediately.</p></div>
          <div className="mode-metrics"><div><span>Protected Essentials</span><strong>${Math.round(insights?.moneyMode?.protectedMoney || 0)}</strong></div><div><span>Money Mode</span><strong>{insights?.moneyMode?.name || 'Setup Needed'}</strong></div></div>
          <div className="csv-preview-list">
            {costs.map((cost) => <div key={cost.id}><span>{String(cost.nextDueDate).slice(0, 10)}</span><strong>{cost.name} · {cost.currency} {Number(cost.originalAmount ?? cost.amount).toFixed(2)}</strong><span><button type="button" onClick={() => edit(cost)}>Edit</button> <button type="button" onClick={() => toggle(cost)}>{cost.enabled ? 'Pause' : 'Enable'}</button> <button type="button" aria-label={`Delete ${cost.name}`} onClick={() => remove(cost.id)}><Trash2 size={14} /></button></span></div>)}
            {!costs.length && <p>No protected costs yet.</p>}
          </div>
          <div><h3>Recurring payments to review</h3><p>Detected candidates only affect safe-to-spend after you protect them.</p></div>
          <div className="csv-preview-list">
            {recurring.filter((item) => item.protectionStatus === 'PENDING').map((item) => <div key={item.id}><span>{item.cadence}</span><strong>{item.description} · {item.currency} {Number(item.amount).toFixed(2)}</strong><span><button type="button" onClick={() => reviewRecurring(item.id, 'PROTECTED')}>Protect</button> <button type="button" onClick={() => reviewRecurring(item.id, 'IGNORED')}>Ignore</button></span></div>)}
            {!recurring.some((item) => item.protectionStatus === 'PENDING') && <p>No recurring payments need review.</p>}
          </div>
        </Card>
      </div>
      {status && <p className="status-message" role="status">{status}</p>}
    </PageContainer>
  );
}

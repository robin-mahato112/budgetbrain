import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PageContainer from '../components/layout/PageContainer';
import { useFinance } from '../hooks/useFinance';

const categories = ['Housing', 'Groceries', 'Transport', 'Bills', 'Insurance', 'Debt', 'Subscriptions', 'Emergency', 'Other essentials'];

export default function ProtectedEssentials() {
  const { addTransaction, refreshTransactions, insights } = useFinance();
  const [form, setForm] = useState({ name: '', amount: '', frequency: 'weekly', due: '', category: 'Housing', essential: 'yes' });
  const [status, setStatus] = useState('');

  const save = async (event) => {
    event.preventDefault();
    const result = await addTransaction({
      merchant: form.name,
      description: `${form.name} ${form.frequency} due ${form.due}`.trim(),
      category: form.category,
      amount: form.amount,
      type: 'expense',
    });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    await refreshTransactions();
    setForm({ name: '', amount: '', frequency: 'weekly', due: '', category: 'Housing', essential: 'yes' });
    setStatus('Protected essential saved.');
  };

  return (
    <PageContainer eyebrow="Essentials" title="Protected Essentials" description="Protect rent, food, transport, bills, debt, and other essentials before anything is marked safe to spend.">
      <div className="settings-grid settings-grid--wide">
        <Card className="settings-card">
          <ShieldCheck size={22} />
          <div><h2>Add protected item</h2><p>Keep it short. These costs reduce safe-to-spend before payday.</p></div>
          <form className="settings-form" onSubmit={save}>
            <Input label="Name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Rent" />
            <Input label="Amount" required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="300" />
            <label>Frequency
              <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="one-time">One-time</option>
              </select>
            </label>
            <Input label="Next due date" value={form.due} onChange={(event) => setForm((current) => ({ ...current, due: event.target.value }))} placeholder="Thursday" />
            <label>Category
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>Essential
              <select value={form.essential} onChange={(event) => setForm((current) => ({ ...current, essential: event.target.value }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <Button type="submit">Save protected essential</Button>
          </form>
        </Card>
        <Card className="settings-card">
          <ShieldCheck size={22} />
          <div><h2>Protected summary</h2><p>BudgetBrain protects essentials first, then calculates what is safe to spend.</p></div>
          <div className="mode-metrics">
            <div><span>Protected Essentials</span><strong>${Math.round(insights?.moneyMode?.protectedMoney || 0)}</strong></div>
            <div><span>Money Mode</span><strong>{insights?.moneyMode?.name || 'Setup Needed'}</strong></div>
            <div><span>Confidence</span><strong>{insights?.confidence?.level || 'Not Ready'}</strong></div>
          </div>
        </Card>
      </div>
      {status && <p className="status-message" role="status">{status}</p>}
    </PageContainer>
  );
}

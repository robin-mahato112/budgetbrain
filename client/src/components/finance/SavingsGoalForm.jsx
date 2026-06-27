import { useState } from 'react';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';

export default function SavingsGoalForm() {
  const { savingsGoals, addSavingsGoal } = useFinance();
  const [form, setForm] = useState({ name: '', target: '', current: '', monthly: '', deadline: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await addSavingsGoal(form);
    if (!result.ok) {
      setError(result.message);
      setSaving(false);
      return;
    }
    setError('');
    setForm({ name: '', target: '', current: '', monthly: '', deadline: '' });
    setSaving(false);
  };

  return (
    <div className="tool-layout">
      <Card className="tool-form-card">
        <div className="card-heading"><div><span className="card-heading__eyebrow">New target</span><h2>Create a savings goal</h2></div></div>
        <form className="stack-form" onSubmit={submit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Input label="Goal name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <div className="form-grid">
            <Input label="Target amount" type="number" min="1" value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} required />
            <Input label="Already saved" type="number" min="0" value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} />
          </div>
          <div className="form-grid">
            <Input label="Monthly contribution" type="number" min="0" value={form.monthly} onChange={(event) => setForm({ ...form, monthly: event.target.value })} />
            <Input label="Target date" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create savings goal'}</Button>
        </form>
      </Card>
      <div className="goal-list">
        {savingsGoals.map((goal) => {
          const rawPercent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
          const percent = Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0));
          return (
            <Card className="goal-card" key={goal.id}>
              <div><span>{goal.deadline}</span><h3>{goal.name}</h3></div>
              <strong>{Math.round(percent)}%</strong>
              <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
              <p>{formatCurrency(goal.current)} saved of {formatCurrency(goal.target)}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

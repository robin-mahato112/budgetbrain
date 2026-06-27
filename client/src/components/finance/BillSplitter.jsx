import { useState } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';

export default function BillSplitter() {
  const [form, setForm] = useState({ total: '', people: '2', tip: '10' });
  const [result, setResult] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const total = Number(form.total);
    const people = Number(form.people);
    const tipPercent = Number(form.tip || 0);
    if (![total, people, tipPercent].every(Number.isFinite) || total <= 0 || people < 1 || !Number.isInteger(people) || tipPercent < 0 || tipPercent > 100) {
      setResult({ error: 'Enter a valid bill, a whole number of people, and a tip from 0% to 100%.' });
      return;
    }
    const tipAmount = total * (tipPercent / 100);
    setResult({ tip: tipAmount, grandTotal: total + tipAmount, perPerson: (total + tipAmount) / people });
  };

  return (
    <div className="tool-layout">
      <Card className="tool-form-card">
        <div className="card-heading"><div><span className="card-heading__eyebrow">Shared expense</span><h2>Split a bill</h2></div></div>
        <form className="stack-form" onSubmit={submit}>
          <Input label="Bill total" type="number" min="0.01" step="0.01" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} required />
          <Input label="Number of people" type="number" min="1" step="1" value={form.people} onChange={(event) => setForm({ ...form, people: event.target.value })} required />
          <Input label="Tip percentage" type="number" min="0" max="100" value={form.tip} onChange={(event) => setForm({ ...form, tip: event.target.value })} />
          <Button type="submit">Split bill</Button>
        </form>
      </Card>
      <Card className="tool-result-card">
        <span className="card-heading__eyebrow">Each person pays</span>
        {result?.error ? <p className="form-error">{result.error}</p> : <h2>{formatCurrency(result?.perPerson || 0, { decimals: 2 })}</h2>}
        <p>Based on the bill, tip, and group size entered.</p>
        <dl>
          <div><dt>Tip amount</dt><dd>{formatCurrency(result?.tip || 0, { decimals: 2 })}</dd></div>
          <div><dt>Grand total</dt><dd>{formatCurrency(result?.grandTotal || 0, { decimals: 2 })}</dd></div>
        </dl>
      </Card>
    </div>
  );
}

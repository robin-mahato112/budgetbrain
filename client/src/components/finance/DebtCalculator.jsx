import { useState } from 'react';
import { calculateDebtPayoff } from '../../utils/calculateDebtPayoff';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';

export default function DebtCalculator() {
  const [form, setForm] = useState({ balance: '', rate: '', payment: '' });
  const [result, setResult] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    setResult(calculateDebtPayoff(form.balance, form.rate, form.payment));
  };

  return (
    <div className="tool-layout">
      <Card className="tool-form-card">
        <div className="card-heading"><div><span className="card-heading__eyebrow">Payoff scenario</span><h2>Debt details</h2></div></div>
        <form className="stack-form" onSubmit={submit}>
          <Input label="Current balance" type="number" min="1" value={form.balance} onChange={(event) => setForm({ ...form, balance: event.target.value })} required />
          <Input label="Annual interest rate" type="number" min="0" step="0.01" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} required />
          <Input label="Monthly payment" type="number" min="1" value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })} required />
          <Button type="submit">Calculate payoff</Button>
        </form>
      </Card>
      <Card className="tool-result-card">
        <span className="card-heading__eyebrow">Payoff estimate</span>
        {result?.error ? <p className="form-error">{result.error}</p> : (
          <>
            <h2>{result ? `${result.months} months` : 'No scenario yet'}</h2>
            <p>Estimated time to clear the debt at the entered payment.</p>
            <dl>
              <div><dt>Total repaid</dt><dd>{formatCurrency(result?.totalPaid || 0)}</dd></div>
              <div><dt>Total interest</dt><dd>{formatCurrency(result?.totalInterest || 0)}</dd></div>
            </dl>
          </>
        )}
      </Card>
    </div>
  );
}

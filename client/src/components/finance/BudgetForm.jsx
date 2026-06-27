import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { calculateBudget } from '../../utils/calculateBudget';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import { createId } from '../../utils/createId';

export default function BudgetForm() {
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState([{ id: createId(), name: '', amount: '' }]);
  const [result, setResult] = useState(null);

  const updateExpense = (id, field, value) => setExpenses((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const removeExpense = (id) => setExpenses((current) => current.filter((item) => item.id !== id));

  return (
    <div className="tool-layout">
      <Card className="tool-form-card">
        <div className="card-heading"><div><span className="card-heading__eyebrow">Monthly plan</span><h2>Income and expenses</h2></div></div>
        <form className="stack-form" noValidate onSubmit={(event) => { event.preventDefault(); setResult(calculateBudget(income, expenses)); }}>
          <Input label="Monthly income" type="number" min="0" value={income} onChange={(event) => setIncome(event.target.value)} required />
          <div className="repeater">
            <div className="repeater__heading"><span>Expenses</span><Button type="button" variant="ghost" size="small" icon={Plus} onClick={() => setExpenses([...expenses, { id: createId(), name: '', amount: '' }])}>Add</Button></div>
            {expenses.map((expense) => (
              <div className="repeater__row" key={expense.id}>
                <Input aria-label="Expense name" placeholder="Rent, groceries..." value={expense.name} onChange={(event) => updateExpense(expense.id, 'name', event.target.value)} />
                <Input aria-label="Expense amount" type="number" placeholder="0.00" min="0" value={expense.amount} onChange={(event) => updateExpense(expense.id, 'amount', event.target.value)} />
                <button type="button" className="icon-button" disabled={expenses.length === 1} onClick={() => removeExpense(expense.id)} aria-label="Remove expense"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
          <Button type="submit">Calculate budget</Button>
        </form>
      </Card>
      <Card className="tool-result-card">
        <span className="card-heading__eyebrow">Your result</span>
        {result?.error ? <p className="form-error">{result.error}</p> : <h2>{result ? formatCurrency(result.remaining) : '$0'}</h2>}
        <p>Estimated amount remaining after listed expenses.</p>
        <dl>
          <div><dt>Total expenses</dt><dd>{formatCurrency(result?.totalExpenses || 0)}</dd></div>
          <div><dt>Savings rate</dt><dd>{(result?.savingsRate || 0).toFixed(1)}%</dd></div>
        </dl>
      </Card>
    </div>
  );
}

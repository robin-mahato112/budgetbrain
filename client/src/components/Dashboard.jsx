import { useState } from 'react';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('budget');

  // Budget Tracker
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState([{ name: '', amount: '' }]);
  const [budgetResult, setBudgetResult] = useState(null);

  // Savings Goals
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [monthlySaving, setMonthlySaving] = useState('');
  const [savingsResult, setSavingsResult] = useState(null);

  // Debt Calculator
  const [debtAmount, setDebtAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [debtResult, setDebtResult] = useState(null);

  // Bill Splitter
  const [billTotal, setBillTotal] = useState('');
  const [people, setPeople] = useState('');
  const [tip, setTip] = useState('0');
  const [splitResult, setSplitResult] = useState(null);

  const addExpense = () => setExpenses([...expenses, { name: '', amount: '' }]);
  const updateExpense = (i, field, value) => {
    const updated = [...expenses];
    updated[i][field] = value;
    setExpenses(updated);
  };
  const removeExpense = (i) => setExpenses(expenses.filter((_, idx) => idx !== i));

  const calculateBudget = () => {
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const remaining = (parseFloat(income) || 0) - totalExpenses;
    const savingsRate = income ? ((remaining / parseFloat(income)) * 100).toFixed(1) : 0;
    setBudgetResult({ totalExpenses, remaining, savingsRate });
  };

  const calculateSavings = () => {
    const months = Math.ceil((parseFloat(goalAmount) || 0) / (parseFloat(monthlySaving) || 1));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    setSavingsResult({ months, years, remainingMonths });
  };

  const calculateDebt = () => {
    const principal = parseFloat(debtAmount) || 0;
    const rate = (parseFloat(interestRate) || 0) / 100 / 12;
    const payment = parseFloat(monthlyPayment) || 0;
    if (rate === 0) {
      const months = Math.ceil(principal / payment);
      setDebtResult({ months, totalPaid: (payment * months).toFixed(2), totalInterest: '0.00' });
      return;
    }
    const months = Math.ceil(-Math.log(1 - (rate * principal) / payment) / Math.log(1 + rate));
    const totalPaid = (payment * months).toFixed(2);
    const totalInterest = (totalPaid - principal).toFixed(2);
    setDebtResult({ months, totalPaid, totalInterest });
  };

  const calculateSplit = () => {
    const total = parseFloat(billTotal) || 0;
    const numPeople = parseInt(people) || 1;
    const tipAmount = (total * (parseFloat(tip) / 100));
    const grandTotal = total + tipAmount;
    const perPerson = (grandTotal / numPeople).toFixed(2);
    setSplitResult({ perPerson, grandTotal: grandTotal.toFixed(2), tipAmount: tipAmount.toFixed(2) });
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.tabs}>
        {[
          { id: 'budget', label: '💰 Budget' },
          { id: 'savings', label: '🎯 Savings' },
          { id: 'debt', label: '💳 Debt' },
          { id: 'split', label: '🧾 Split' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'budget' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>💰 Budget Tracker</h2>
          <div className={styles.field}>
            <label>Monthly Income ($)</label>
            <input type="number" placeholder="e.g. 3000" value={income} onChange={e => setIncome(e.target.value)} />
          </div>
          <div className={styles.expenseList}>
            <label>Expenses</label>
            {expenses.map((exp, i) => (
              <div key={i} className={styles.expenseRow}>
                <input placeholder="Name (e.g. Rent)" value={exp.name} onChange={e => updateExpense(i, 'name', e.target.value)} />
                <input type="number" placeholder="Amount" value={exp.amount} onChange={e => updateExpense(i, 'amount', e.target.value)} />
                {expenses.length > 1 && <button className={styles.removeBtn} onClick={() => removeExpense(i)}>✕</button>}
              </div>
            ))}
            <button className={styles.addBtn} onClick={addExpense}>+ Add Expense</button>
          </div>
          <button className={styles.calcBtn} onClick={calculateBudget}>Calculate Budget</button>
          {budgetResult && (
            <div className={styles.result}>
              <div className={styles.resultCard}>
                <span>Total Expenses</span>
                <strong>${budgetResult.totalExpenses.toFixed(2)}</strong>
              </div>
              <div className={`${styles.resultCard} ${budgetResult.remaining >= 0 ? styles.positive : styles.negative}`}>
                <span>Remaining</span>
                <strong>${budgetResult.remaining.toFixed(2)}</strong>
              </div>
              <div className={styles.resultCard}>
                <span>Savings Rate</span>
                <strong>{budgetResult.savingsRate}%</strong>
              </div>
              <p className={styles.tip}>
                {budgetResult.remaining >= 0
                  ? `Great! You save ${budgetResult.savingsRate}% of your income. Try to save at least 20%!`
                  : `⚠️ You're overspending by $${Math.abs(budgetResult.remaining).toFixed(2)}. Review your expenses!`}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'savings' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>🎯 Savings Goal Calculator</h2>
          <div className={styles.field}>
            <label>Goal Name</label>
            <input placeholder="e.g. New Car, Emergency Fund" value={goalName} onChange={e => setGoalName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Target Amount ($)</label>
            <input type="number" placeholder="e.g. 10000" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Monthly Savings ($)</label>
            <input type="number" placeholder="e.g. 500" value={monthlySaving} onChange={e => setMonthlySaving(e.target.value)} />
          </div>
          <button className={styles.calcBtn} onClick={calculateSavings}>Calculate</button>
          {savingsResult && (
            <div className={styles.result}>
              <div className={styles.resultCard}>
                <span>Time to reach {goalName || 'goal'}</span>
                <strong>{savingsResult.years > 0 ? `${savingsResult.years}y ` : ''}{savingsResult.remainingMonths}m</strong>
              </div>
              <div className={styles.resultCard}>
                <span>Total Months</span>
                <strong>{savingsResult.months}</strong>
              </div>
              <p className={styles.tip}>
                💡 Saving ${monthlySaving}/month, you'll reach your ${goalAmount} goal in {savingsResult.months} months!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'debt' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>💳 Debt Payoff Calculator</h2>
          <div className={styles.field}>
            <label>Total Debt ($)</label>
            <input type="number" placeholder="e.g. 5000" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Annual Interest Rate (%)</label>
            <input type="number" placeholder="e.g. 18.5" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Monthly Payment ($)</label>
            <input type="number" placeholder="e.g. 200" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
          </div>
          <button className={styles.calcBtn} onClick={calculateDebt}>Calculate</button>
          {debtResult && (
            <div className={styles.result}>
              <div className={styles.resultCard}>
                <span>Months to Pay Off</span>
                <strong>{debtResult.months}</strong>
              </div>
              <div className={styles.resultCard}>
                <span>Total Paid</span>
                <strong>${debtResult.totalPaid}</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.negative}`}>
                <span>Total Interest</span>
                <strong>${debtResult.totalInterest}</strong>
              </div>
              <p className={styles.tip}>
                💡 Increasing your monthly payment even by $50 can save you months of payments!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'split' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>🧾 Bill Splitter</h2>
          <div className={styles.field}>
            <label>Total Bill ($)</label>
            <input type="number" placeholder="e.g. 120" value={billTotal} onChange={e => setBillTotal(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Number of People</label>
            <input type="number" placeholder="e.g. 4" value={people} onChange={e => setPeople(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Tip (%)</label>
            <div className={styles.tipBtns}>
              {['0', '10', '15', '20', '25'].map(t => (
                <button key={t} className={`${styles.tipBtn} ${tip === t ? styles.activeTip : ''}`} onClick={() => setTip(t)}>{t}%</button>
              ))}
            </div>
          </div>
          <button className={styles.calcBtn} onClick={calculateSplit}>Split Bill</button>
          {splitResult && (
            <div className={styles.result}>
              <div className={styles.resultCard}>
                <span>Tip Amount</span>
                <strong>${splitResult.tipAmount}</strong>
              </div>
              <div className={styles.resultCard}>
                <span>Grand Total</span>
                <strong>${splitResult.grandTotal}</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.positive}`}>
                <span>Per Person</span>
                <strong>${splitResult.perPerson}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

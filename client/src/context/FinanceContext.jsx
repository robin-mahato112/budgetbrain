import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { budgetService } from '../services/budgetService';
import { savingsService } from '../services/savingsService';
import { debtService } from '../services/debtService';

export const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0, debt: 0 });
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [debts, setDebts] = useState([]);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      budgetService.getSummary(),
      budgetService.getBudgets(),
      budgetService.getTransactions(),
      savingsService.getGoals(),
      debtService.getDebts(),
      budgetService.getSpendingTrend(),
    ]).then(([nextSummary, nextBudgets, nextTransactions, nextGoals, nextDebts, nextTrend]) => {
      if (!active) return;
      if (nextSummary.status === 'fulfilled') setSummary(nextSummary.value);
      if (nextBudgets.status === 'fulfilled') setBudgets(nextBudgets.value);
      if (nextTransactions.status === 'fulfilled') setTransactions(nextTransactions.value);
      if (nextGoals.status === 'fulfilled') setSavingsGoals(nextGoals.value);
      if (nextDebts.status === 'fulfilled') setDebts(nextDebts.value);
      if (nextTrend.status === 'fulfilled') setSpendingTrend(nextTrend.value);
      if ([nextSummary, nextBudgets, nextTransactions, nextGoals, nextDebts, nextTrend].some((result) => result.status === 'rejected')) {
        setError('Some finance data could not be loaded. Available sections are still usable.');
      }
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const addTransaction = useCallback(async (transaction) => {
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !['income', 'expense'].includes(transaction.type)) {
      return { ok: false, message: 'Enter a valid amount greater than zero.' };
    }
    let next;
    try {
      next = await budgetService.createTransaction({
        merchant: String(transaction.merchant || '').trim() || (transaction.type === 'income' ? 'Income' : 'Expense'),
        category: String(transaction.category || '').trim() || 'Other',
        amount: Math.abs(amount),
        type: transaction.type,
      });
    } catch (requestError) {
      return { ok: false, message: requestError.response?.data?.message || 'The transaction could not be saved.' };
    }
    next = { ...next, date: 'Just now' };
    setTransactions((current) => [next, ...current]);
    setSummary((current) => ({
      ...current,
      income: transaction.type === 'income' ? current.income + Math.abs(amount) : current.income,
      expenses: transaction.type === 'expense' ? current.expenses + Math.abs(amount) : current.expenses,
    }));
    Promise.all([budgetService.getBudgets(), budgetService.getSpendingTrend()])
      .then(([nextBudgets, nextTrend]) => {
        setBudgets(nextBudgets);
        setSpendingTrend(nextTrend);
      })
      .catch(() => setError('The transaction was saved, but dashboard totals could not be refreshed.'));
    return { ok: true };
  }, []);

  const addSavingsGoal = useCallback(async (goal) => {
    const target = Number(goal.target);
    const current = Number(goal.current || 0);
    const monthly = goal.monthly === '' || goal.monthly === undefined ? null : Number(goal.monthly);
    if (!String(goal.name || '').trim() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0 || (monthly !== null && (!Number.isFinite(monthly) || monthly < 0))) {
      return { ok: false, message: 'Enter a goal name and valid non-negative amounts.' };
    }
    let saved;
    try {
      saved = await savingsService.createGoal({
        name: String(goal.name).trim(),
        current,
        target,
        monthly,
        deadline: goal.deadline || null,
      });
    } catch (requestError) {
      return { ok: false, message: requestError.response?.data?.message || 'The savings goal could not be saved.' };
    }
    setSavingsGoals((goals) => [saved, ...goals]);
    return { ok: true };
  }, []);

  const value = useMemo(() => ({
    summary,
    budgets,
    transactions,
    savingsGoals,
    debts,
    spendingTrend,
    loading,
    error,
    addTransaction,
    addSavingsGoal,
  }), [summary, budgets, transactions, savingsGoals, debts, spendingTrend, loading, error, addTransaction, addSavingsGoal]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

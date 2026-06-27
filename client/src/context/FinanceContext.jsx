import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { budgetService } from '../services/budgetService';

export const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0, debt: 0 });
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      budgetService.getSummary(),
      budgetService.getTransactions(),
      budgetService.getInsights(),
    ]).then(([nextSummary, nextTransactions, nextInsights]) => {
      if (!active) return;
      if (nextSummary.status === 'fulfilled') setSummary(nextSummary.value);
      if (nextTransactions.status === 'fulfilled') setTransactions(nextTransactions.value);
      if (nextInsights.status === 'fulfilled') setInsights(nextInsights.value);
      if ([nextSummary, nextTransactions, nextInsights].some((result) => result.status === 'rejected')) {
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
        description: transaction.description ? String(transaction.description).trim() : undefined,
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
    budgetService.getInsights()
      .then((nextInsights) => setInsights(nextInsights))
      .catch(() => setError('The transaction was saved, but dashboard totals could not be refreshed.'));
    return { ok: true };
  }, []);

  const refreshTransactions = useCallback(async (search = '') => {
    const [nextTransactions, nextSummary, nextInsights] = await Promise.all([
      budgetService.getTransactions(200, search),
      budgetService.getSummary(),
      budgetService.getInsights(),
    ]);
    setTransactions(nextTransactions);
    setSummary(nextSummary);
    setInsights(nextInsights);
    return nextTransactions;
  }, []);

  const importTransactions = useCallback(async (csvText) => {
    let result;
    try {
      result = await budgetService.importTransactions(csvText);
      await refreshTransactions();
    } catch (requestError) {
      return { ok: false, message: requestError.response?.data?.message || 'CSV import failed.' };
    }
    return { ok: true, ...result };
  }, [refreshTransactions]);

  const connectDemoBank = useCallback(async (scenario) => {
    let result;
    try {
      result = await budgetService.connectDemoBank(scenario);
      await refreshTransactions();
    } catch (requestError) {
      return { ok: false, message: requestError.response?.data?.message || 'Demo bank sync failed.' };
    }
    return { ok: true, ...result };
  }, [refreshTransactions]);

  const disconnectDemoBank = useCallback(async () => {
    let result;
    try {
      result = await budgetService.disconnectDemoBank();
      await refreshTransactions();
    } catch (requestError) {
      return { ok: false, message: requestError.response?.data?.message || 'Demo bank could not be disconnected.' };
    }
    return { ok: true, ...result };
  }, [refreshTransactions]);

  const value = useMemo(() => ({
    summary,
    transactions,
    insights,
    loading,
    error,
    addTransaction,
    importTransactions,
    connectDemoBank,
    disconnectDemoBank,
    refreshTransactions,
  }), [summary, transactions, insights, loading, error, addTransaction, importTransactions, connectDemoBank, disconnectDemoBank, refreshTransactions]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

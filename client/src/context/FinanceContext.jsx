import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { budgetService } from '../services/budgetService';

export const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0, debt: 0 });
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [financialState, setFinancialState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      budgetService.getSummary(),
      budgetService.getTransactions(),
      budgetService.getInsights(),
      budgetService.getFinancialState(),
    ]).then(([nextSummary, nextTransactions, nextInsights, nextState]) => {
      if (!active) return;
      if (nextSummary.status === 'fulfilled') setSummary(nextSummary.value);
      if (nextTransactions.status === 'fulfilled') setTransactions(nextTransactions.value);
      if (nextState.status === 'fulfilled') setFinancialState(nextState.value);
      if (nextInsights.status === 'fulfilled') setInsights(mergeFinancialState(nextInsights.value, nextState.status === 'fulfilled' ? nextState.value : null));
      if ([nextSummary, nextTransactions, nextInsights, nextState].some((result) => result.status === 'rejected')) {
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
        currency: transaction.currency || undefined,
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
    const [nextTransactions, nextSummary, nextInsights, nextState] = await Promise.all([
      budgetService.getTransactions(200, search),
      budgetService.getSummary(),
      budgetService.getInsights(),
      budgetService.getFinancialState(),
    ]);
    setTransactions(nextTransactions);
    setSummary(nextSummary);
    setFinancialState(nextState);
    setInsights(mergeFinancialState(nextInsights, nextState));
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

  const previewCsvImport = useCallback(async (csvText, fileName, mapping) => {
    try { return { ok: true, ...(await budgetService.previewCsvImport(csvText, fileName, mapping)) }; }
    catch (requestError) { return { ok: false, message: requestError.response?.data?.message || 'CSV preview failed.' }; }
  }, []);

  const confirmCsvImport = useCallback(async (id) => {
    try { const result = await budgetService.confirmCsvImport(id); await refreshTransactions(); return { ok: true, ...result }; }
    catch (requestError) { return { ok: false, message: requestError.response?.data?.message || 'CSV import failed.' }; }
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
    financialState,
    loading,
    error,
    addTransaction,
    importTransactions,
    previewCsvImport,
    confirmCsvImport,
    connectDemoBank,
    disconnectDemoBank,
    refreshTransactions,
  }), [summary, transactions, insights, financialState, loading, error, addTransaction, importTransactions, previewCsvImport, confirmCsvImport, connectDemoBank, disconnectDemoBank, refreshTransactions]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

function mergeFinancialState(insights, state) {
  if (!state) return insights;
  const recovery = state.mode === 'RECOVERY';
  return {
    ...insights,
    moneyMode: {
      ...(insights?.moneyMode || {}),
      name: recovery ? 'Recovery Mode' : state.nextPayday ? 'Freedom Mode' : 'Setup Needed',
      status: recovery ? 'recovery' : state.nextPayday ? 'freedom' : 'setup',
      currentBalance: state.availableBalance,
      protectedMoney: state.protectedAmount,
      guiltFreeSpending: Math.max(0, state.safeToSpend),
      recoveryGap: state.shortfall,
      suggestedSpendingLimit: Math.max(0, state.safeToSpend),
      nextPayday: state.nextPayday || 'Not set',
      survivalPriorities: ['Housing / rent', 'Food basics', 'Transport to work or study', 'Critical utilities and medicine', 'Mandatory debt payments'],
      pauseOrReduce: state.recoveryAdjustments?.map((item) => `${item.label} (${item.amount.toFixed(2)})`) || [],
    },
    moneyPressure: { level: titleCase(state.moneyPressure), reason: state.moneyPressureReasons.join(' • '), action: recovery ? `Close the ${state.shortfall.toFixed(2)} shortfall without cutting critical obligations.` : `${Math.max(0, state.safeToSpend).toFixed(2)} remains safe before payday.` },
    confidence: { level: titleCase(state.confidence), reason: state.confidenceReasons.join(' • '), checks: state.confidenceReasons.map((label) => ({ label, ok: !/missing|stale|No |need/i.test(label) })) },
    futureCashflow: { ...(insights?.futureCashflow || {}), committedBeforePayday: state.upcomingObligationsTotal, items: state.upcomingObligations.map((item) => ({ label: item.name, amount: item.amount, dueDate: item.dueDate })) },
  };
}

function titleCase(value) { const text = String(value || '').toLowerCase(); return text ? text[0].toUpperCase() + text.slice(1) : ''; }

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { budgetService } from '../services/budgetService';

export const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0, debt: 0 });
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [financialState, setFinancialState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const revision = useRef(0);

  const refreshTransactions = useCallback(async (search = '') => {
    const request = ++revision.current;
    const results = await Promise.allSettled([
      budgetService.getTransactions(200, search), budgetService.getSummary(),
      budgetService.getInsights(), budgetService.getFinancialState(),
    ]);
    if (request !== revision.current) return [];
    const [ledger, totals, advice, state] = results;
    if (ledger.status === 'fulfilled') setTransactions(ledger.value);
    if (totals.status === 'fulfilled') setSummary(totals.value);
    // Never continue displaying old spending guidance after a failed refresh.
    const guidanceReady = advice.status === 'fulfilled' && state.status === 'fulfilled';
    setInsights(guidanceReady ? advice.value : null);
    setFinancialState(guidanceReady ? state.value : null);
    const failed = results.some((result) => result.status === 'rejected');
    setError(failed ? 'Some finance data could not be refreshed. Retry before using the spending estimate.' : '');
    setLoading(false);
    if (failed) throw new Error('Finance refresh failed');
    return ledger.value;
  }, []);

  useEffect(() => {
    refreshTransactions().catch(() => {});
    return () => { revision.current += 1; };
  }, [refreshTransactions]);

  const mutateAndRefresh = useCallback(async (operation, failureMessage) => {
    let result;
    try { result = await operation(); }
    catch (requestError) { return { ok: false, message: requestError.response?.data?.message || failureMessage }; }
    // A refresh failure must not encourage submitting an already-saved mutation again.
    try { await refreshTransactions(); }
    catch { return { ...result, ok: true, refreshFailed: true, message: 'Saved. Refresh the dashboard to load updated totals.' }; }
    return { ...result, ok: true };
  }, [refreshTransactions]);

  const addTransaction = useCallback(async (transaction) => {
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !['income', 'expense'].includes(transaction.type)) return { ok: false, message: 'Enter a valid amount greater than zero.' };
    return mutateAndRefresh(() => budgetService.createTransaction({
      merchant: String(transaction.merchant || '').trim() || (transaction.type === 'income' ? 'Income' : 'Expense'),
      description: transaction.description ? String(transaction.description).trim() : undefined,
      category: String(transaction.category || '').trim() || 'Other', amount,
      type: transaction.type, currency: transaction.currency || undefined,
    }), 'The transaction could not be saved.');
  }, [mutateAndRefresh]);

  const importTransactions = useCallback((csvText) => mutateAndRefresh(() => budgetService.importTransactions(csvText), 'CSV import failed.'), [mutateAndRefresh]);
  const confirmCsvImport = useCallback((id) => mutateAndRefresh(() => budgetService.confirmCsvImport(id), 'CSV import failed.'), [mutateAndRefresh]);
  const connectDemoBank = useCallback((scenario) => mutateAndRefresh(() => budgetService.connectDemoBank(scenario), 'Demo bank sync failed.'), [mutateAndRefresh]);
  const disconnectDemoBank = useCallback(() => mutateAndRefresh(() => budgetService.disconnectDemoBank(), 'Demo bank could not be disconnected.'), [mutateAndRefresh]);
  const previewCsvImport = useCallback(async (csvText, fileName, mapping) => {
    try { return { ok: true, ...(await budgetService.previewCsvImport(csvText, fileName, mapping)) }; }
    catch (requestError) { return { ok: false, message: requestError.response?.data?.message || 'CSV preview failed.' }; }
  }, []);

  const value = useMemo(() => ({ summary, transactions, insights, financialState, loading, error, addTransaction, importTransactions, previewCsvImport, confirmCsvImport, connectDemoBank, disconnectDemoBank, refreshTransactions }), [summary, transactions, insights, financialState, loading, error, addTransaction, importTransactions, previewCsvImport, confirmCsvImport, connectDemoBank, disconnectDemoBank, refreshTransactions]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

import { useContext, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceContext, FinanceProvider } from '../context/FinanceContext';
import { budgetService } from '../services/budgetService';

vi.mock('../services/budgetService', () => ({ budgetService: {
  getSummary: vi.fn(), getTransactions: vi.fn(), getInsights: vi.fn(), getFinancialState: vi.fn(), createTransaction: vi.fn(),
} }));
function Probe() {
  const finance = useContext(FinanceContext); const [saved, setSaved] = useState('');
  return <><p>{finance.loading ? 'Loading' : 'Ready'}</p><p>{finance.insights ? 'Guidance available' : 'No guidance'}</p><p>{finance.financialState?.safeToSpend}</p><p>{finance.error}</p><p>{saved}</p><button onClick={async () => { const result = await finance.addTransaction({ merchant: 'Lunch', amount: 10, type: 'expense' }); setSaved(result.ok ? 'Saved once' : 'Save failed'); }}>Add lunch</button></>;
}
describe('finance refresh after mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks(); budgetService.getSummary.mockResolvedValue({ income: 0, expenses: 0 });
    budgetService.getTransactions.mockResolvedValue([]); budgetService.getInsights.mockResolvedValue({ moneyMode: { name: 'Freedom Mode' } });
    budgetService.getFinancialState.mockResolvedValue({ safeToSpend: 150 }); budgetService.createTransaction.mockResolvedValue({ id: 'lunch' });
  });
  it('reloads authoritative state after saving a transaction', async () => {
    render(<FinanceProvider><Probe /></FinanceProvider>); await screen.findByText('Ready');
    budgetService.getFinancialState.mockResolvedValue({ safeToSpend: 120 });
    fireEvent.click(screen.getByRole('button', { name: 'Add lunch' }));
    await screen.findByText('Saved once'); expect(screen.getByText('120')).toBeInTheDocument();
    expect(budgetService.getFinancialState).toHaveBeenCalledTimes(2);
  });
  it('reports a saved mutation as successful but removes stale guidance if refresh fails', async () => {
    render(<FinanceProvider><Probe /></FinanceProvider>); await screen.findByText('Ready');
    budgetService.getFinancialState.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Add lunch' }));
    await screen.findByText('Saved once');
    await waitFor(() => expect(screen.getByText('No guidance')).toBeInTheDocument());
    expect(screen.getByText(/Retry before using/)).toBeInTheDocument();
    expect(budgetService.createTransaction).toHaveBeenCalledTimes(1);
  });
});

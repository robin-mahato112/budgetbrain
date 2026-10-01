import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedEssentials from '../pages/ProtectedEssentials';
import { budgetService } from '../services/budgetService';

const finance = vi.hoisted(() => ({ refreshTransactions: vi.fn(), insights: null }));
vi.mock('../hooks/useFinance', () => ({ useFinance: () => finance }));
vi.mock('../services/budgetService', () => ({ budgetService: { getProtectedCosts: vi.fn(), getRecurringPatterns: vi.fn(), updateRecurringPattern: vi.fn() } }));
const recurring = { id: 'phone', description: 'Phone plan', amount: 30, currency: 'AUD', cadence: 'MONTHLY', protectionStatus: 'PROTECTED' };
describe('recurring protection controls', () => {
  beforeEach(() => { vi.clearAllMocks(); budgetService.getProtectedCosts.mockResolvedValue([]); budgetService.getRecurringPatterns.mockResolvedValue([recurring]); finance.refreshTransactions.mockResolvedValue([]); });
  it('lets a user reverse a previously protected recurring payment and refreshes state', async () => {
    budgetService.updateRecurringPattern.mockResolvedValue({ ...recurring, protectionStatus: 'IGNORED' });
    render(<ProtectedEssentials />);
    fireEvent.click(await screen.findByText('Previously reviewed recurring payments'));
    fireEvent.click(screen.getByRole('button', { name: 'Stop protecting' }));
    await waitFor(() => expect(budgetService.updateRecurringPattern).toHaveBeenCalledWith('phone', 'IGNORED'));
    await screen.findByText('Recurring payment ignored.');
    expect(finance.refreshTransactions).toHaveBeenCalled();
  });
  it('shows a failed recurring decision without pretending it saved', async () => {
    budgetService.updateRecurringPattern.mockRejectedValue(new Error('offline'));
    render(<ProtectedEssentials />);
    fireEvent.click(await screen.findByText('Previously reviewed recurring payments'));
    fireEvent.click(screen.getByRole('button', { name: 'Stop protecting' }));
    expect(await screen.findByRole('status')).toHaveTextContent('The change could not be saved. Please retry.');
    expect(finance.refreshTransactions).not.toHaveBeenCalled();
  });
});

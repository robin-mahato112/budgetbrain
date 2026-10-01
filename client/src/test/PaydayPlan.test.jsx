import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaydayPlan from '../components/dashboard/PaydayPlan';

const finance = vi.hoisted(() => ({ financialState: null, loading: false, error: '', refreshTransactions: vi.fn() }));
vi.mock('../hooks/useFinance', () => ({ useFinance: () => finance }));
const readyState = {
  readiness: { ready: true, checks: [] }, currency: 'USD', availableBalance: 500, upcomingObligationsTotal: 300,
  safetyBuffer: 50, safeToSpend: 150, dailySafeToSpend: 30, daysUntilPayday: 5,
  assumptions: ['Expected income is not available today.'],
  upcomingObligations: [{ id: 'rent', name: 'Rent', dueDate: '2026-10-05', amount: 300 }], recurringNeedsReview: [{ id: 'phone' }],
};
function show() { render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PaydayPlan /></MemoryRouter>); }
describe('payday plan', () => {
  beforeEach(() => { finance.financialState = structuredClone(readyState); finance.loading = false; finance.error = ''; });
  it('shows the server breakdown, base currency, upcoming bills and review link', () => {
    show();
    expect(screen.getByText('Where your balance goes')).toBeInTheDocument();
    expect(screen.getByText('USD 150.00', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review 1 recurring payment' })).toHaveAttribute('href', '/protected-essentials');
    expect(screen.getByText('Expected income is not available today.')).toBeInTheDocument();
  });
  it('provides a setup link instead of a spending allowance when payday is expired', () => {
    finance.financialState.readiness = { ready: false, checks: [{ id: 'payday', ok: false, label: 'Confirm your next payday', href: '/payday-setup' }] };
    finance.financialState.dailySafeToSpend = null;
    show();
    expect(screen.getByRole('link', { name: /Confirm your next payday/ })).toHaveAttribute('href', '/payday-setup');
    expect(screen.getByText('Setup needed')).toBeInTheDocument();
  });
  it('offers retry when the state request failed', () => {
    finance.financialState = null; finance.error = 'Refresh failed'; finance.refreshTransactions.mockResolvedValue([]);
    show(); fireEvent.click(screen.getByRole('button', { name: 'Retry loading plan' }));
    expect(finance.refreshTransactions).toHaveBeenCalled();
  });
});

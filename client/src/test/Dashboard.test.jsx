import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';

const finance = {
  summary: { income: 7200, expenses: 4680, savings: 1850, debt: 12400 },
  budgets: [{ id: '1', category: 'Housing', spent: 1000, limit: 2000, color: '#123456' }],
  transactions: [{ id: '1', merchant: 'Salary', category: 'Income', date: 'Today', amount: 7200, type: 'income' }],
  spendingTrend: [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: 1200 }],
  insights: {
    monthlyIncome: 7200,
    monthlyExpenses: 4680,
    netSavings: 2520,
    topSpendingCategory: { category: 'Housing', amount: 1000 },
    moneyLeaks: [],
    importedTransactions: 2,
    essentialsSpending: 1800,
    lifestyleSpending: 400,
    debtRepayments: 200,
    emergencyBuffer: { daysCovered: 20 },
    moneyMode: {
      name: 'Freedom Mode',
      status: 'freedom',
      currentBalance: 2520,
      protectedMoney: 1800,
      guiltFreeSpending: 720,
      recoveryGap: 0,
      suggestedSpendingLimit: 720,
      upcomingBills: 1800,
      nextPayday: 'Friday',
      survivalPriorities: [],
      pauseOrReduce: [],
    },
    confidence: { level: 'High', lastUpdatedAt: '2026-06-27T10:40:00Z' },
    moneyPressure: { level: 'Low', reason: 'Protected essentials are covered.', action: 'You can spend up to 720 before payday.' },
    demoBank: {
      connected: true,
      label: 'Demo Bank Connected',
      lastSyncedAt: '2026-06-27T10:40:00Z',
      disclaimer: 'This uses sample bank data. No real bank account is connected.',
    },
  },
  error: '',
  connectDemoBank: vi.fn(),
  disconnectDemoBank: vi.fn(),
};

vi.mock('../hooks/useFinance', () => ({ useFinance: () => finance }));
vi.mock('../services/chatService', () => ({ chatService: { explainSafeToSpend: vi.fn() } }));
vi.mock('../services/budgetService', () => ({ budgetService: { getDemoScenarios: vi.fn().mockResolvedValue([{ id: 'freedom', label: 'Freedom Demo' }]) } }));

describe('Dashboard', () => {
  beforeEach(() => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Dashboard /></MemoryRouter>));

  it('renders the focused money assistant dashboard', () => {
    expect(screen.getByRole('heading', { name: /payday guardrail/i })).toBeInTheDocument();
    expect(screen.getByText('Freedom Mode')).toBeInTheDocument();
    expect(screen.getByText('Safe to Spend')).toBeInTheDocument();
    expect(screen.getByText(/\$720 Safe/i)).toBeInTheDocument();
    expect(screen.getByText('Demo Bank Connected')).toBeInTheDocument();
    expect(screen.getAllByText(/Confidence: High/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Money Pressure').length).toBeGreaterThan(0);
    expect(screen.getByText('Update your payday guardrail')).toBeInTheDocument();
    expect(screen.getByText('Recent transactions')).toBeInTheDocument();
  });
});

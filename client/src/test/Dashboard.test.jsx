import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';

const finance = {
  summary: { income: 7200, expenses: 4680, savings: 1850, debt: 12400 },
  budgets: [{ id: '1', category: 'Housing', spent: 1000, limit: 2000, color: '#123456' }],
  transactions: [{ id: '1', merchant: 'Salary', category: 'Income', date: 'Today', amount: 7200, type: 'income' }],
  spendingTrend: [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: 1200 }],
  error: '',
};

vi.mock('../hooks/useFinance', () => ({ useFinance: () => finance }));
vi.mock('../services/chatService', () => ({ chatService: { send: vi.fn() } }));

describe('Dashboard', () => {
  beforeEach(() => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Dashboard /></MemoryRouter>));

  it('renders the finance summary and compact advisor', () => {
    expect(screen.getByRole('heading', { name: /financial dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('Total income')).toBeInTheDocument();
    expect(screen.getByText('BudgetBrain AI')).toBeInTheDocument();
    expect(screen.getByText('Recent transactions')).toBeInTheDocument();
  });
});

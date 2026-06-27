import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InsightCards from '../components/dashboard/InsightCards';
import Transactions from '../pages/Transactions';
import { budgetService } from '../services/budgetService';
import MoneyModePanel from '../components/dashboard/MoneyModePanel';
import SmartEntryPanel from '../components/dashboard/SmartEntryPanel';
import InsightCharts from '../components/dashboard/InsightCharts';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DemoBankPanel from '../components/dashboard/DemoBankPanel';
import MiniGuardPreview from '../components/dashboard/MiniGuardPreview';
import Settings from '../pages/Settings';
import PaydaySetup from '../pages/PaydaySetup';

const finance = {
  insights: {
    monthlyIncome: 5000,
    monthlyExpenses: 2400,
    netSavings: 2600,
    topSpendingCategory: { category: 'Dining', amount: 900, share: 37.5 },
    highestTransaction: { merchant: 'Rent', amount: 1600, type: 'expense', category: 'Housing' },
    importedTransactions: 4,
    categoryWarning: 'You spent 38% of expenses on Dining this month. Consider setting a category budget.',
    essentialsSpending: 1200,
    lifestyleSpending: 900,
    debtRepayments: 300,
    financialHealth: { status: 'High Pressure', reasons: ['Your expenses are 87% of income.'] },
    moneyLeaks: [{ title: 'Subscription check', message: 'You have 86 in subscriptions this month.' }],
    futureCashflow: { committedBeforePayday: 620, items: [{ label: 'Debt repayments', amount: 300 }], warning: '$620 is already committed before payday.' },
    emergencyBuffer: { daysCovered: 9, message: 'You can cover 9 days of essential expenses.', oneMonthGap: 1260 },
    moneyMode: {
      name: 'Watch Mode',
      status: 'watch',
      message: 'You can still spend, but pressure is building. Be careful with flexible spending until payday.',
      currentBalance: 620,
      protectedMoney: 540,
      guiltFreeSpending: 80,
      recoveryGap: 0,
      suggestedSpendingLimit: 80,
      upcomingBills: 540,
      survivalPriorities: [],
      pauseOrReduce: ['Dining', 'Shopping'],
      reasons: ['Safe-to-spend money is low.'],
    },
  },
  transactions: [
    { id: '1', date: '1 Jun', merchant: 'Woolworths', category: 'Groceries', type: 'expense', amount: -82.4 },
    { id: '2', date: '2 Jun', merchant: 'Salary', category: 'Income', type: 'income', amount: 1400 },
  ],
  importTransactions: vi.fn(),
  refreshTransactions: vi.fn(),
  connectDemoBank: vi.fn(),
  disconnectDemoBank: vi.fn(),
  spendingTrend: [{ month: 'Mar', amount: 1200 }, { month: 'Apr', amount: 900 }],
};

vi.mock('../hooks/useFinance', () => ({ useFinance: () => finance }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'Robin Mahato', email: 'robin@example.com' }, logout: vi.fn() }) }));
vi.mock('../services/chatService', () => ({ chatService: { explainSafeToSpend: vi.fn().mockResolvedValue({ explanation: 'You have safe money after essentials are protected.' }) } }));
vi.mock('../services/authService', () => ({
  authService: {
    getPreferences: vi.fn().mockResolvedValue({ allowAiFinancialSummary: true, includeUploadedDocumentsInAi: false }),
    updateProfile: vi.fn(),
    updatePreferences: vi.fn(),
    exportData: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));
vi.mock('../services/budgetService', () => ({
  budgetService: {
    checkAffordability: vi.fn(),
    uploadDocument: vi.fn(),
    createTransaction: vi.fn(),
    quickAddPreview: vi.fn(),
    confirmDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDemoScenarios: vi.fn(),
  },
}));

describe('portfolio upgrade UI', () => {
  beforeEach(() => {
    finance.transactions = [
      { id: '1', date: '1 Jun', merchant: 'Woolworths', category: 'Groceries', type: 'expense', amount: -82.4 },
      { id: '2', date: '2 Jun', merchant: 'Salary', category: 'Income', type: 'income', amount: 1400 },
    ];
    finance.insights.moneyMode = {
      name: 'Watch Mode',
      status: 'watch',
      message: 'You can still spend, but pressure is building. Be careful with flexible spending until payday.',
      currentBalance: 620,
      protectedMoney: 540,
      guiltFreeSpending: 80,
      recoveryGap: 0,
      suggestedSpendingLimit: 80,
      upcomingBills: 540,
      survivalPriorities: [],
      pauseOrReduce: ['Dining', 'Shopping'],
      reasons: ['Safe-to-spend money is low.'],
    };
    finance.insights.confidence = { level: 'High', lastUpdatedAt: '2026-06-27T10:40:00Z' };
    finance.insights.demoBank = {
      connected: true,
      label: 'Demo Bank Connected',
      lastSyncedAt: '2026-06-27T10:40:00Z',
      disclaimer: 'This uses sample bank data. No real bank account is connected.',
    };
    finance.importTransactions.mockReset().mockResolvedValue({ ok: true, imported: 3 });
    finance.refreshTransactions.mockReset().mockResolvedValue(finance.transactions);
    finance.connectDemoBank.mockReset().mockResolvedValue({
      ok: true,
      message: 'Demo bank connected successfully. Transactions and balance synced.',
      lastSyncedAt: '2026-06-27T10:40:00Z',
    });
    finance.disconnectDemoBank.mockReset().mockResolvedValue({ ok: true, removed: 9 });
    budgetService.checkAffordability.mockReset().mockResolvedValue({
      mode: 'Watch Mode',
      message: 'This is possible, but it will leave only 15 safe-to-spend until payday.',
    });
    budgetService.quickAddPreview.mockReset().mockResolvedValue({
      id: 'doc-1',
      kind: 'quick_add',
      extractedData: {
        items: [{ description: 'Lunch', merchant: 'Lunch', amount: 25, category: 'Dining', occurredAt: '2026-06-27' }],
      },
    });
    budgetService.uploadDocument.mockReset().mockResolvedValue({
      id: 'pay-1',
      extractionStatus: 'MANUAL_FALLBACK',
      extractionMessage: 'Gemini OCR is not configured. Review and enter the details manually.',
      extractedData: { employer: 'Queens Wharf Bistro', netPay: 1400, payDate: '2026-06-27' },
    });
    budgetService.createTransaction.mockReset().mockResolvedValue({});
    budgetService.confirmDocument.mockReset().mockResolvedValue({ saved: 1 });
    budgetService.deleteDocument.mockReset().mockResolvedValue({});
    budgetService.getDemoScenarios.mockReset().mockResolvedValue([
      { id: 'freedom', label: 'Freedom Demo' },
      { id: 'watch', label: 'Watch Demo' },
      { id: 'recovery', label: 'Recovery Demo' },
      { id: 'student', label: 'Student Worker Demo' },
      { id: 'renter', label: 'Renter Demo' },
    ]);
  });

  it('renders dashboard insight cards and category warning', () => {
    render(<InsightCards />);
    expect(screen.getByText('Demo Bank Status')).toBeInTheDocument();
    expect(screen.getByText('Protected Essentials')).toBeInTheDocument();
    expect(screen.getByText('Money Pressure')).toBeInTheDocument();
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    expect(screen.getByText(/spent 38%/i)).toBeInTheDocument();
  });

  it('renders Watch Mode and checks a possible purchase', async () => {
    render(<MoneyModePanel />);
    expect(screen.getByText('Watch Mode')).toBeInTheDocument();
    expect(screen.getByText('Safe to Spend')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Purchase amount'), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'dining with friends' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Dinner after work with my team' } });
    fireEvent.click(screen.getByRole('button', { name: /check purchase/i }));

    expect(await screen.findByText(/leave only 15 safe-to-spend/i)).toBeInTheDocument();
    expect(budgetService.checkAffordability).toHaveBeenCalledWith({
      amount: '65',
      category: 'dining with friends',
      description: 'Dinner after work with my team',
    });
  });

  it('renders Freedom Mode wording', () => {
    finance.insights.moneyMode = {
      ...finance.insights.moneyMode,
      name: 'Freedom Mode',
      status: 'freedom',
      message: 'You have money available to enjoy after protecting your important expenses.',
      guiltFreeSpending: 270,
      suggestedSpendingLimit: 270,
    };

    render(<MoneyModePanel />);
    expect(screen.getByText('Freedom Mode')).toBeInTheDocument();
    expect(screen.getByText('Safe to Spend')).toBeInTheDocument();
    expect(screen.getByText(/spend up to \$270/i)).toBeInTheDocument();
  });

  it('renders Recovery Mode with recovery gap and survival priorities', () => {
    finance.insights.moneyMode = {
      ...finance.insights.moneyMode,
      name: 'Recovery Mode',
      status: 'recovery',
      message: 'You are in Recovery Mode. The goal is not saving right now. The goal is to stop the financial bleeding and get back to zero safely.',
      currentBalance: -180,
      protectedMoney: 160,
      guiltFreeSpending: 0,
      recoveryGap: 340,
      suggestedSpendingLimit: 0,
      upcomingBills: 420,
      survivalPriorities: ['Housing / rent', 'Food basics', 'Transport to work or study'],
      pauseOrReduce: ['Dining', 'Shopping', 'Extra subscriptions'],
    };

    render(<MoneyModePanel />);
    expect(screen.getByText('Recovery Mode')).toBeInTheDocument();
    expect(screen.getByText('Recovery gap')).toBeInTheDocument();
    expect(screen.getByText('Housing / rent')).toBeInTheDocument();
    expect(screen.getByText('Pause or reduce')).toBeInTheDocument();
  });

  it('shows setup prompt when protected money is missing', () => {
    finance.insights.moneyMode = {
      ...finance.insights.moneyMode,
      name: 'Setup Needed',
      status: 'setup',
      message: 'Protected money is not set yet. Add rent, bills, or upload transactions so BudgetBrain can protect your essentials.',
      protectedMoney: 0,
      protectedMoneyMissing: true,
      guiltFreeSpending: 2588,
      suggestedSpendingLimit: 0,
      nextPayday: 'Not set',
    };

    render(<MoneyModePanel />);
    expect(screen.getByText('Setup Needed')).toBeInTheDocument();
    expect(screen.getByText('Protected money not set')).toBeInTheDocument();
    expect(screen.getByText(/Add income, rent, bills/i)).toBeInTheDocument();
  });

  it('renders transaction import controls and transaction table', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Transactions /></MemoryRouter>);
    expect(screen.getByText('Upload transactions')).toBeInTheDocument();
    expect(screen.getByText('Woolworths')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByLabelText('Search transactions')).toHaveValue('');
  });

  it('renders useful charts without breaking the dashboard', () => {
    render(<InsightCharts />);
    expect(screen.getByText('Spending by category')).toBeInTheDocument();
    expect(screen.getByText('Protected vs safe to spend')).toBeInTheDocument();
  });

  it('does not show bad everything categories in recent transactions', () => {
    finance.transactions = [{ id: 'bad-1', date: 'Today', merchant: 'k', category: 'everything', type: 'expense', amount: -12 }];
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RecentTransactions /></MemoryRouter>);
    expect(screen.queryByText('everything')).not.toBeInTheDocument();
    expect(screen.getAllByText('Needs review').length).toBeGreaterThan(0);
  });

  it('renders low-effort income setup options and saves quick main income', async () => {
    render(<PaydaySetup />);
    expect(screen.getByText('Upload payslip')).toBeInTheDocument();
    expect(screen.getByText('Payday basics')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Expected pay amount'), { target: { value: '1400' } });
    fireEvent.change(screen.getByLabelText('Next payday'), { target: { value: 'Friday' } });
    fireEvent.click(screen.getByRole('button', { name: /save payday setup/i }));
    await waitFor(() => expect(budgetService.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1400,
      type: 'income',
    })));
  });

  it('previews and edits AI-detected quick-add fields before saving', async () => {
    render(<SmartEntryPanel />);
    expect(screen.getByText('Update your payday guardrail')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/spent \$25/i), { target: { value: 'I spent $25 on lunch today' } });
    fireEvent.click(screen.getByRole('button', { name: /preview sentence/i }));

    const description = await screen.findByLabelText('Item 1 description');
    fireEvent.change(description, { target: { value: 'Lunch with coworkers' } });
    fireEvent.click(screen.getByRole('button', { name: /save confirmed/i }));

    await waitFor(() => expect(budgetService.confirmDocument).toHaveBeenCalledWith('doc-1', expect.objectContaining({
      items: [expect.objectContaining({ description: 'Lunch with coworkers' })],
    })));
  });

  it('connects demo bank from the setup card', async () => {
    finance.insights.demoBank = { connected: false };
    finance.insights.confidence = { level: 'Not Ready' };
    render(<DemoBankPanel />);

    expect(await screen.findByRole('button', { name: /connect demo bank/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Choose demo scenario'), { target: { value: 'watch' } });
    fireEvent.click(screen.getByRole('button', { name: /connect demo bank/i }));

    await waitFor(() => expect(finance.connectDemoBank).toHaveBeenCalledWith('watch'));
    expect(await screen.findByText(/Demo bank connected successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/No real bank account is connected/i)).toBeInTheDocument();
  });

  it('renders Mini Guard preview with confidence and synced status', () => {
    finance.insights.confidence = { level: 'High', lastUpdatedAt: '2026-06-27T10:40:00Z' };
    finance.insights.demoBank = { connected: true, lastSyncedAt: '2026-06-27T10:40:00Z' };
    render(<MiniGuardPreview />);

    expect(screen.getByText(/\$80 Safe/i)).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Last Synced')).toBeInTheDocument();
  });

  it('renders professional settings sections and sensitive password prompts', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Settings /></MemoryRouter>);
    expect(screen.getByRole('tab', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Demo Bank' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current password for sensitive changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'AI Settings' }));
    expect(screen.getByText(/AI explanations are educational only/i)).toBeInTheDocument();
  });

  it('imports a CSV file and shows success feedback', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Transactions /></MemoryRouter>);
    const file = new File(['date,description,amount,type\n2026-06-01,Woolworths,-82.40,expense'], 'transactions.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText(/choose a csv file/i), { target: { files: [file] } });
    await screen.findByText('transactions.csv');
    fireEvent.submit(screen.getByRole('button', { name: 'Import CSV' }).closest('form'));

    await waitFor(() => expect(finance.importTransactions).toHaveBeenCalledWith(expect.stringContaining('Woolworths')));
    expect(await screen.findByText('3 transactions imported and categorized.')).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopNavbar from '../components/layout/TopNavbar';
import Login from '../pages/Login';
import PaydaySetup from '../pages/PaydaySetup';
import Register from '../pages/Register';

const auth = {
  user: { name: 'Robin Mahato', email: 'robin@example.com' },
  login: vi.fn(),
  register: vi.fn(),
};

const finance = {
  addTransaction: vi.fn(),
  refreshTransactions: vi.fn(),
  insights: { demoBank: { connected: false }, confidence: { level: 'Not Ready' } },
};

vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../hooks/useFinance', () => ({ useFinance: () => finance }));
vi.mock('../services/budgetService', () => ({ budgetService: { uploadDocument: vi.fn() } }));

const router = (ui) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>;

describe('input typing regressions', () => {
  beforeEach(() => {
    auth.user = null;
    auth.login.mockReset().mockResolvedValue({});
    auth.register.mockReset().mockResolvedValue({});
    finance.addTransaction.mockReset().mockResolvedValue({ ok: true });
    finance.refreshTransactions.mockReset().mockResolvedValue([]);
  });

  it('keeps login fields editable for full values, edits, and paste-like updates', () => {
    render(router(<Login />));

    const email = screen.getByLabelText('Email address');
    const password = screen.getByLabelText('Password');

    fireEvent.change(email, { target: { value: 'robin.mahato+demo@example.com' } });
    fireEvent.change(password, { target: { value: 'correct horse battery staple' } });
    expect(email).toHaveValue('robin.mahato+demo@example.com');
    expect(password).toHaveValue('correct horse battery staple');

    fireEvent.change(password, { target: { value: 'correct horse battery' } });
    expect(password).toHaveValue('correct horse battery');

    fireEvent.paste(email, { clipboardData: { getData: () => 'demo@budgetbrain.local' } });
    fireEvent.change(email, { target: { value: 'demo@budgetbrain.local' } });
    expect(email).toHaveValue('demo@budgetbrain.local');
  });

  it('keeps register name and email fields editable with multiple words', () => {
    render(router(<Register />));

    const name = screen.getByLabelText('Full name');
    const email = screen.getByLabelText('Email address');

    fireEvent.change(name, { target: { value: 'Robin Kumar Mahato' } });
    fireEvent.change(email, { target: { value: 'robin.mahato@example.com' } });

    expect(name).toHaveValue('Robin Kumar Mahato');
    expect(email).toHaveValue('robin.mahato@example.com');
  });

  it('keeps payday setup fields editable with spaces and later edits', () => {
    render(<PaydaySetup />);

    const payday = screen.getByLabelText('Next payday');
    fireEvent.change(payday, { target: { value: 'Friday after work' } });
    expect(payday).toHaveValue('Friday after work');

    fireEvent.change(payday, { target: { value: 'Friday' } });
    expect(payday).toHaveValue('Friday');
  });

  it('opens the compact account menu from the top bar', () => {
    auth.user = { name: 'Robin Mahato', email: 'robin@example.com' };
    render(router(<TopNavbar />));

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Privacy/i })).toBeInTheDocument();
  });
});

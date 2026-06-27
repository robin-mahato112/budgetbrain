import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../pages/Login';
import Register from '../pages/Register';

const auth = { user: null, login: vi.fn(), register: vi.fn() };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));

describe('auth pages', () => {
  beforeEach(() => {
    auth.login.mockReset().mockResolvedValue({});
    auth.register.mockReset().mockResolvedValue({});
  });

  it('submits login credentials', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Login /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('test@example.com', 'Password123'));
  });

  it('requires consent and submits registration', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Register /></MemoryRouter>);
    const button = screen.getByRole('button', { name: 'Create account' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(button);
    await waitFor(() => expect(auth.register).toHaveBeenCalledWith('Test User', 'test@example.com', 'Password123'));
  });
});

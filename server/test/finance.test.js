import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = '3da104e7-75c7-4d9f-8b16-b2e129cd92db';
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  transaction: { findMany: vi.fn(), create: vi.fn() },
  budget: { findMany: vi.fn() },
  transactionGroup: vi.fn(),
  savingsGoal: { findMany: vi.fn() },
  debt: { findMany: vi.fn() },
}));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const { createApp } = await import('../app.js');
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

describe('finance API', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue({ id: userId, name: 'Test', email: 'test@example.com', role: 'USER' });
    prismaMock.transaction.groupBy = prismaMock.transactionGroup;
  });

  it('returns budget limits with category spending', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      { id: 'f8d72adc-9918-4c79-a36f-bb28fc33b1cd', category: 'Food', limit: 900, month: new Date(), color: '#fff' },
    ]);
    prismaMock.transactionGroup.mockResolvedValue([{ category: 'Food', _sum: { amount: 240 } }]);
    const response = await request(createApp())
      .get('/api/finance/budgets')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ category: 'Food', limit: 900, spent: 240 });
  });

  it('returns a user-scoped finance summary', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([
      { type: 'INCOME', amount: 5000 },
      { type: 'EXPENSE', amount: 1200 },
    ]);
    prismaMock.savingsGoal.findMany.mockResolvedValue([{ current: 800 }]);
    prismaMock.debt.findMany.mockResolvedValue([{ balance: 3000 }]);

    const response = await request(createApp())
      .get('/api/finance/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ income: 5000, expenses: 1200, savings: 800, debt: 3000 });
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where.userId).toBe(userId);
  });

  it('creates a validated transaction', async () => {
    prismaMock.transaction.create.mockResolvedValue({
      id: 'd2ccf8ba-930f-45b3-ac78-0e2fd71536f3',
      userId,
      merchant: 'Salary',
      category: 'Income',
      amount: 2500,
      type: 'INCOME',
      occurredAt: new Date(),
    });
    const response = await request(createApp())
      .post('/api/finance/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchant: 'Salary', category: 'Income', amount: 2500, type: 'income' });

    expect(response.status).toBe(201);
    expect(response.body.amount).toBe(2500);
    expect(response.body.type).toBe('income');
  });
});

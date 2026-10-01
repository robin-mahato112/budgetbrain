import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = '3da104e7-75c7-4d9f-8b16-b2e129cd92db';
const costId = 'd2ccf8ba-930f-45b3-ac78-0e2fd71536f3';
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  protectedCost: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
  recurringTransactionPattern: { findMany: vi.fn() }, debt: { findMany: vi.fn() },
  transaction: { findMany: vi.fn(), findFirst: vi.fn() },
}));
vi.mock('../lib/prisma.js', () => ({ prisma: db }));
const { createApp } = await import('../app.js');
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

describe('financial-state API ownership and purchase contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const payday = new Date(); payday.setUTCDate(payday.getUTCDate() + 7);
    db.user.findUnique.mockResolvedValue({ id: userId, currentBalance: 500, safetyBuffer: 50, nextPayday: payday, paydayConfirmed: true, baseCurrency: 'AUD' });
    db.protectedCost.findMany.mockResolvedValue([{ id: costId, name: 'Rent', amount: 300, enabled: true, classification: 'FIXED', frequency: 'ONE_TIME', nextDueDate: payday }]);
    db.protectedCost.findFirst.mockResolvedValue(null);
    db.recurringTransactionPattern.findMany.mockResolvedValue([]);
    db.debt.findMany.mockResolvedValue([]);
    db.transaction.findMany.mockResolvedValue([]);
    db.transaction.findFirst.mockResolvedValue(null);
  });
  it('requires authentication for a financial state', async () => {
    expect((await request(createApp()).get('/api/finance/financial-state')).status).toBe(401);
    expect(db.protectedCost.findMany).not.toHaveBeenCalled();
  });
  it('scopes all financial reads to the signed-in user and matches the purchase result', async () => {
    const state = await request(createApp()).get('/api/finance/financial-state').set('Authorization', `Bearer ${token}`);
    expect(state.status).toBe(200);
    expect(state.body.safeToSpend).toBe(150);
    for (const model of ['protectedCost', 'recurringTransactionPattern', 'debt', 'transaction']) expect(db[model].findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId }) }));
    const purchase = await request(createApp()).post('/api/finance/affordability').set('Authorization', `Bearer ${token}`).send({ amount: 151 });
    expect(purchase.body).toMatchObject({ affordable: false, recoveryGap: 1, safeToSpendBefore: state.body.safeToSpend });
  });
  it.each(['patch', 'delete'])('does not %s a different user’s protected cost', async (method) => {
    const operation = request(createApp())[method](`/api/finance/protected-costs/${costId}`).set('Authorization', `Bearer ${token}`);
    const response = await (method === 'patch' ? operation.send({ enabled: false }) : operation);
    expect(response.status).toBe(404);
    expect(db.protectedCost.findFirst).toHaveBeenCalledWith({ where: { id: costId, userId } });
    expect(db.protectedCost.update).not.toHaveBeenCalled();
    expect(db.protectedCost.delete).not.toHaveBeenCalled();
  });
  it('rejects a past payday without changing saved settings', async () => {
    const response = await request(createApp()).put('/api/finance/payday').set('Authorization', `Bearer ${token}`).send({ currentBalance: 500, nextPayday: '2000-01-01', paydayConfirmed: true, expectedIncome: 1000, incomeFrequency: 'WEEKLY', safetyBuffer: 50 });
    expect(response.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

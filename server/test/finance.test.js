import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = '3da104e7-75c7-4d9f-8b16-b2e129cd92db';
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  transaction: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
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
    prismaMock.transaction.findMany.mockReset();
    prismaMock.transaction.create.mockReset();
    prismaMock.transaction.createMany.mockReset();
    prismaMock.transaction.deleteMany.mockReset();
    prismaMock.transaction.findFirst.mockReset();
    prismaMock.transactionGroup.mockReset();
    prismaMock.savingsGoal.findMany.mockReset();
    prismaMock.debt.findMany.mockReset();
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

  it('rejects unclear one-letter transaction descriptions', async () => {
    const response = await request(createApp())
      .post('/api/finance/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchant: 'k', category: 'everything', amount: 12, type: 'expense' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('UNCLEAR_TRANSACTION_DESCRIPTION');
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('imports CSV transactions and auto-categorizes them for the current user', async () => {
    prismaMock.transaction.createMany.mockResolvedValue({ count: 3 });
    const csv = [
      'date,description,amount,type',
      '2026-06-01,Woolworths,-82.40,expense',
      '2026-06-02,Salary,1400.00,income',
      '2026-06-03,Netflix,-22.99,expense',
    ].join('\n');

    const response = await request(createApp())
      .post('/api/finance/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/csv')
      .send(csv);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ imported: 3, categories: { Groceries: 1, Income: 1, Subscriptions: 1 } });
    expect(prismaMock.transaction.createMany.mock.calls[0][0].data[0]).toMatchObject({
      userId,
      merchant: 'Woolworths',
      category: 'Groceries',
      source: 'csv',
      type: 'EXPENSE',
    });
  });

  it('rejects invalid CSV uploads', async () => {
    const response = await request(createApp())
      .post('/api/finance/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/csv')
      .send('date,amount\n2026-06-01,10');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('CSV_MISSING_COLUMNS');
    expect(prismaMock.transaction.createMany).not.toHaveBeenCalled();
  });

  it('requires authentication for CSV imports', async () => {
    const response = await request(createApp())
      .post('/api/finance/transactions/import')
      .set('Content-Type', 'text/csv')
      .send('date,description,amount,type\n2026-06-01,Woolworths,-10,expense');

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.createMany).not.toHaveBeenCalled();
  });

  it('returns monthly transaction insights', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([
      { merchant: 'Salary', category: 'Income', amount: 5000, type: 'INCOME', source: 'csv', occurredAt: new Date() },
      { merchant: 'Cafe', category: 'Dining', amount: 900, type: 'EXPENSE', source: 'csv', occurredAt: new Date() },
      { merchant: 'Rent', category: 'Housing', amount: 1600, type: 'EXPENSE', source: 'manual', occurredAt: new Date() },
    ]);
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([
        { merchant: 'Salary', category: 'Income', amount: 5000, type: 'INCOME', source: 'csv', occurredAt: new Date() },
        { merchant: 'Cafe', category: 'Dining', amount: 900, type: 'EXPENSE', source: 'csv', occurredAt: new Date() },
        { merchant: 'Rent', category: 'Housing', amount: 1600, type: 'EXPENSE', source: 'manual', occurredAt: new Date() },
      ])
      .mockResolvedValueOnce([{ merchant: 'Cafe', category: 'Dining', amount: 500, type: 'EXPENSE', source: 'csv', occurredAt: new Date() }]);
    prismaMock.debt.findMany.mockResolvedValue([{ name: 'Credit card', balance: 2500, annualRate: 19.99, minimumPayment: 180 }]);
    prismaMock.savingsGoal.findMany.mockResolvedValue([{ name: 'Emergency buffer', current: 800 }]);

    const response = await request(createApp())
      .get('/api/finance/insights')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      monthlyIncome: 5000,
      monthlyExpenses: 2500,
      netSavings: 2500,
      importedTransactions: 2,
      topSpendingCategory: { category: 'Housing', amount: 1600 },
    });
    expect(response.body.financialHealth.status).toBeTruthy();
    expect(response.body.moneyLeaks.length).toBeGreaterThanOrEqual(1);
    expect(response.body.emergencyBuffer.daysCovered).toBeGreaterThanOrEqual(0);
    expect(response.body.debtPressure.highestInterestDebt.name).toBe('Credit card');
    expect(response.body.categoryWarning).toContain('Housing');
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where.userId).toBe(userId);
  });

  it('keeps non-AI finance features working when Groq is not configured', async () => {
    const previousKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    prismaMock.transaction.findMany.mockResolvedValue([
      { type: 'INCOME', amount: 3000 },
      { type: 'EXPENSE', amount: 700 },
    ]);
    prismaMock.savingsGoal.findMany.mockResolvedValue([]);
    prismaMock.debt.findMany.mockResolvedValue([]);

    const response = await request(createApp())
      .get('/api/finance/summary')
      .set('Authorization', `Bearer ${token}`);

    process.env.GROQ_API_KEY = previousKey;
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ income: 3000, expenses: 700 });
  });

  it('checks purchase affordability with authenticated user data', async () => {
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([
        { merchant: 'Salary', category: 'Income', amount: 2000, type: 'INCOME', source: 'csv', occurredAt: new Date() },
        { merchant: 'Rent', category: 'Housing', amount: 500, type: 'EXPENSE', source: 'csv', occurredAt: new Date() },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.debt.findMany.mockResolvedValue([]);
    prismaMock.savingsGoal.findMany.mockResolvedValue([{ name: 'Emergency fund', current: 1200 }]);

    const response = await request(createApp())
      .post('/api/finance/affordability')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 180, category: 'shopping', description: 'new shoes' });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('Freedom Mode');
    expect(response.body.message).toContain('guilt-free spending');
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where.userId).toBe(userId);
  });

  it('uploads a supported document and waits for confirmation before saving', async () => {
    const response = await request(createApp())
      .post('/api/finance/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/plain')
      .set('X-File-Name', 'woolworths-receipt.txt')
      .set('X-Document-Kind', 'receipt')
      .send('Woolworths\n2026-06-27\nTotal $82.40');

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('NEEDS_CONFIRMATION');
    expect(response.body.extractionStatus).toMatch(/AI_DETECTED|MANUAL_FALLBACK/);
    expect(response.body.extractedData.merchant).toContain('Woolworths');
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported uploads and saves confirmed payslip net pay as income', async () => {
    const rejected = await request(createApp())
      .post('/api/finance/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/zip')
      .send('not supported');
    expect(rejected.status).toBe(400);

    prismaMock.transaction.create.mockResolvedValue({ id: 'd2ccf8ba-930f-45b3-ac78-0e2fd71536f3', amount: 1400, type: 'INCOME' });
    const upload = await request(createApp())
      .post('/api/finance/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/plain')
      .set('X-File-Name', 'payslip.txt')
      .set('X-Document-Kind', 'payslip')
      .send('Queens Wharf Bistro\nPay date 2026-06-27\nGross pay $1650\nTax withheld $250\nNet pay $1400');

    const confirmed = await request(createApp())
      .post(`/api/finance/documents/${upload.body.id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ editedData: { ...upload.body.extractedData, netPay: 1400 } });

    expect(confirmed.status).toBe(201);
    expect(prismaMock.transaction.create.mock.calls[0][0].data).toMatchObject({
      userId,
      amount: 1400,
      type: 'INCOME',
      source: 'ai_document',
    });
  });

  it('previews quick-add text before saving detected expenses', async () => {
    prismaMock.transaction.createMany.mockResolvedValue({ count: 2 });
    const preview = await request(createApp())
      .post('/api/finance/documents/quick-add')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'I spent $25 on lunch and $60 on petrol today.' });

    expect(preview.status).toBe(201);
    expect(preview.body.extractedData.items).toHaveLength(2);
    expect(prismaMock.transaction.createMany).not.toHaveBeenCalled();

    const confirmed = await request(createApp())
      .post(`/api/finance/documents/${preview.body.id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ editedData: preview.body.extractedData });
    expect(confirmed.body.saved).toBe(2);
  });

  it('connects mock demo bank and stores user-owned demo balance and transactions', async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.transaction.createMany.mockResolvedValue({ count: 9 });

    const response = await request(createApp())
      .post('/api/demo-bank/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({ scenario: 'freedom' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      connected: true,
      scenario: 'freedom',
      confidenceLevel: 'High',
    });
    expect(response.body.disclaimer).toContain('No real bank account');
    expect(prismaMock.transaction.deleteMany.mock.calls[0][0].where).toEqual({
      userId,
      source: { in: ['demo_bank', 'demo_balance'] },
    });
    const saved = prismaMock.transaction.createMany.mock.calls[0][0].data;
    expect(saved[0]).toMatchObject({ userId, source: 'demo_balance', merchant: 'Demo bank balance' });
    expect(saved.some((item) => item.userId === userId && item.source === 'demo_bank' && item.merchant === 'Rent')).toBe(true);
    expect(saved.every((item) => item.userId === userId)).toBe(true);
  });

  it('disconnects only the authenticated user demo bank data', async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 9 });

    const response = await request(createApp())
      .delete('/api/demo-bank/disconnect')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ disconnected: true, removed: 9 });
    expect(prismaMock.transaction.deleteMany.mock.calls[0][0].where.userId).toBe(userId);
  });
});

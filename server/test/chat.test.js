import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors.js';

const userId = '3da104e7-75c7-4d9f-8b16-b2e129cd92db';
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  transaction: { findMany: vi.fn() },
  chat: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  message: { createMany: vi.fn() },
  aiUsage: { findMany: vi.fn() },
  debt: { findMany: vi.fn() },
  savingsGoal: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const usageMock = vi.hoisted(() => ({
  reserveAiRequest: vi.fn(),
  recordAiTokens: vi.fn(),
  getAiUsage: vi.fn(),
}));
const groqCreate = vi.hoisted(() => vi.fn());

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../services/usageService.js', () => usageMock);
vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create: groqCreate } };
  },
}));

const { createApp } = await import('../app.js');
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

describe('chat API', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GROQ_MODEL = 'llama-3.1-8b-instant';
    prismaMock.user.findUnique.mockResolvedValue({ id: userId, name: 'Test', email: 'test@example.com', role: 'USER' });
    prismaMock.transaction.findMany.mockReset();
    prismaMock.transaction.findMany.mockResolvedValueOnce([
      { merchant: 'Cafe', category: 'Dining', amount: 120, type: 'EXPENSE', source: 'csv', occurredAt: new Date() },
      { merchant: 'Salary', category: 'Income', amount: 4000, type: 'INCOME', source: 'csv', occurredAt: new Date() },
    ]).mockResolvedValueOnce([]);
    prismaMock.debt.findMany.mockResolvedValue([{ name: 'Credit card', balance: 1200, annualRate: 19.99, minimumPayment: 120 }]);
    prismaMock.savingsGoal.findMany.mockResolvedValue([{ name: 'Emergency fund', current: 500 }]);
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    prismaMock.chat.create.mockResolvedValue({ id: '03f40f29-0581-46ac-b88b-39cc2d70c906', title: 'Help me budget' });
    prismaMock.message.createMany.mockResolvedValue({ count: 2 });
    usageMock.reserveAiRequest.mockResolvedValue();
    usageMock.recordAiTokens.mockResolvedValue();
    usageMock.getAiUsage.mockResolvedValue({ daily: { used: 1, limit: 2 }, monthly: { used: 1, limit: 3 } });
    groqCreate.mockReset();
    groqCreate.mockResolvedValue({
      choices: [{ message: { content: 'Create a simple spending plan.' } }],
      usage: { prompt_tokens: 10, completion_tokens: 8 },
    });
  });

  it('creates a persisted AI conversation', async () => {
    const response = await request(createApp())
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Help me budget' });

    expect(response.status).toBe(200);
    expect(response.body.reply).toContain('spending plan');
    expect(usageMock.reserveAiRequest).toHaveBeenCalledWith(userId);
    expect(prismaMock.message.createMany).toHaveBeenCalled();
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where.userId).toBe(userId);
    const sentMessages = groqCreate.mock.calls[0][0].messages;
    expect(sentMessages[1].content).toContain('User financial context');
    expect(sentMessages[1].content).toContain('Dining');
    expect(sentMessages[1].content).not.toContain('test@example.com');
    expect(JSON.stringify(response.body)).not.toContain('test-groq-key');
  });

  it('fails gracefully when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY;
    const response = await request(createApp())
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Help me budget' });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AI_NOT_CONFIGURED');
    expect(response.body.message).toContain('GROQ_API_KEY');
    expect(response.body.message).not.toContain('test-groq-key');
    expect(usageMock.reserveAiRequest).not.toHaveBeenCalled();
    expect(groqCreate).not.toHaveBeenCalled();
  });

  it('returns 429 when the AI usage limit is reached', async () => {
    usageMock.reserveAiRequest.mockRejectedValue(new AppError(429, 'AI_USAGE_LIMIT', 'Your daily AI request limit has been reached'));
    const response = await request(createApp())
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Another question' });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('AI_USAGE_LIMIT');
    expect(groqCreate).not.toHaveBeenCalled();
  });

  it('generates a monthly summary from user-scoped financial context', async () => {
    const response = await request(createApp())
      .post('/api/ai/monthly-diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.reply).toBeUndefined();
    expect(response.body.summary).toContain('spending plan');
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where.userId).toBe(userId);
    const contextMessage = groqCreate.mock.calls[0][0].messages[1].content;
    expect(contextMessage).toContain('Imported transaction count');
    expect(contextMessage).not.toContain('test@example.com');
  });

  it('generates an action plan through the backend AI endpoint', async () => {
    const response = await request(createApp())
      .post('/api/ai/action-plan')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.plan).toContain('spending plan');
    expect(JSON.stringify(response.body)).not.toContain('test-groq-key');
  });
});

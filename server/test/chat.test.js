import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors.js';

const userId = '3da104e7-75c7-4d9f-8b16-b2e129cd92db';
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  chat: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  message: { createMany: vi.fn() },
  aiUsage: { findMany: vi.fn() },
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
    prismaMock.user.findUnique.mockResolvedValue({ id: userId, name: 'Test', email: 'test@example.com', role: 'USER' });
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    prismaMock.chat.create.mockResolvedValue({ id: '03f40f29-0581-46ac-b88b-39cc2d70c906', title: 'Help me budget' });
    prismaMock.message.createMany.mockResolvedValue({ count: 2 });
    usageMock.reserveAiRequest.mockResolvedValue();
    usageMock.recordAiTokens.mockResolvedValue();
    usageMock.getAiUsage.mockResolvedValue({ daily: { used: 1, limit: 2 }, monthly: { used: 1, limit: 3 } });
    groqCreate.mockResolvedValue({
      choices: [{ message: { content: 'Create a simple spending plan.' } }],
      usage: { prompt_tokens: 10, completion_tokens: 8 },
    });
  });

  it('creates a persisted AI conversation', async () => {
    const response = await request(createApp())
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Help me budget' });

    expect(response.status).toBe(200);
    expect(response.body.reply).toContain('spending plan');
    expect(usageMock.reserveAiRequest).toHaveBeenCalledWith(userId);
    expect(prismaMock.message.createMany).toHaveBeenCalled();
  });

  it('returns 429 when the AI usage limit is reached', async () => {
    usageMock.reserveAiRequest.mockRejectedValue(new AppError(429, 'AI_USAGE_LIMIT', 'Your daily AI request limit has been reached'));
    const response = await request(createApp())
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Another question' });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('AI_USAGE_LIMIT');
    expect(groqCreate).not.toHaveBeenCalled();
  });
});

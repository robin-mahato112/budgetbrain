import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { createApp } = await import('../app.js');

describe('auth API', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.update.mockReset();
  });

  it('registers a valid user and hashes the password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }) => ({
      id: '3da104e7-75c7-4d9f-8b16-b2e129cd92db',
      role: 'USER',
      ...data,
    }));

    const response = await request(createApp()).post('/api/auth/register').send({
      name: 'Test User',
      email: 'TEST@example.com',
      password: 'Password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty('passwordHash');
    const createData = prismaMock.user.create.mock.calls[0][0].data;
    expect(createData.email).toBe('test@example.com');
    expect(await bcrypt.compare('Password123', createData.passwordHash)).toBe(true);
  });

  it('rejects invalid registration input', async () => {
    const response = await request(createApp()).post('/api/auth/register').send({
      name: 'A',
      email: 'invalid',
      password: 'short',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: '3da104e7-75c7-4d9f-8b16-b2e129cd92db',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
      passwordHash: await bcrypt.hash('Password123', 4),
    });
    const response = await request(createApp()).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Password123',
    });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  it('requires current password for sensitive account updates', async () => {
    const user = {
      id: '3da104e7-75c7-4d9f-8b16-b2e129cd92db',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
      passwordHash: await bcrypt.hash('Password123', 4),
    };
    prismaMock.user.findUnique.mockResolvedValue(user);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    const response = await request(createApp())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com', currentPassword: 'wrong' });

    expect(response.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('saves privacy and AI consent settings with password verification', async () => {
    const user = {
      id: '3da104e7-75c7-4d9f-8b16-b2e129cd92db',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
      passwordHash: await bcrypt.hash('Password123', 4),
    };
    prismaMock.user.findUnique.mockResolvedValue(user);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    const response = await request(createApp())
      .patch('/api/auth/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123', allowAiFinancialSummary: false, includeUploadedDocumentsInAi: false });

    expect(response.status).toBe(200);
    expect(response.body.allowAiFinancialSummary).toBe(false);
    expect(response.body.includeUploadedDocumentsInAi).toBe(false);
  });
});

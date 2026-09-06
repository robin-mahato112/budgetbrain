import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = '3da104e7-75c7-4d9f-8b16-b2e129cd92db';
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  financialConnection: { findUnique: vi.fn() },
}));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const { createApp } = await import('../app.js');
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

describe('integration security', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue({ id: userId, name: 'Test', email: 'test@example.com', role: 'USER' });
    prismaMock.financialConnection.findUnique.mockResolvedValue(null);
  });

  it('rejects unauthenticated integration requests', async () => {
    const response = await request(createApp()).get('/api/integrations/ynab/status');
    expect(response.status).toBe(401);
    expect(prismaMock.financialConnection.findUnique).not.toHaveBeenCalled();
  });

  it('scopes connection status to the authenticated user and degrades when unconfigured', async () => {
    const response = await request(createApp()).get('/api/integrations/ynab/status').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ configured: false, connected: false, status: 'DISCONNECTED' });
    expect(prismaMock.financialConnection.findUnique).toHaveBeenCalledWith({ where: { userId_provider: { userId, provider: 'YNAB' } } });
  });
});

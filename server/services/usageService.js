import { Prisma } from '@prisma/client';
import { AI_LIMITS } from '../config/limits.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const startOfUtcDay = (date = new Date()) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
));

const startOfUtcMonth = (date = new Date()) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  1,
));

async function reserveWithinTransaction(tx, userId, period, periodStart, limit) {
  const existing = await tx.aiUsage.findUnique({
    where: { userId_period_periodStart: { userId, period, periodStart } },
  });
  if ((existing?.requests || 0) >= limit) {
    const label = period === 'DAILY' ? 'daily' : 'monthly';
    throw new AppError(429, 'AI_USAGE_LIMIT', `Your ${label} AI request limit has been reached`);
  }
  await tx.aiUsage.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    create: { userId, period, periodStart, requests: 1 },
    update: { requests: { increment: 1 } },
  });
}

export async function reserveAiRequest(userId, now = new Date()) {
  const dailyStart = startOfUtcDay(now);
  const monthlyStart = startOfUtcMonth(now);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        await reserveWithinTransaction(tx, userId, 'DAILY', dailyStart, AI_LIMITS.daily);
        await reserveWithinTransaction(tx, userId, 'MONTHLY', monthlyStart, AI_LIMITS.monthly);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error) {
      if (error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
}

export async function recordAiTokens(userId, usage = {}, now = new Date()) {
  const promptTokens = Number(usage.prompt_tokens) || 0;
  const completionTokens = Number(usage.completion_tokens) || 0;
  if (!promptTokens && !completionTokens) return;

  await Promise.all([
    prisma.aiUsage.update({
      where: {
        userId_period_periodStart: {
          userId,
          period: 'DAILY',
          periodStart: startOfUtcDay(now),
        },
      },
      data: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
      },
    }),
    prisma.aiUsage.update({
      where: {
        userId_period_periodStart: {
          userId,
          period: 'MONTHLY',
          periodStart: startOfUtcMonth(now),
        },
      },
      data: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
      },
    }),
  ]);
}

export async function getAiUsage(userId, now = new Date()) {
  const records = await prisma.aiUsage.findMany({
    where: {
      userId,
      OR: [
        { period: 'DAILY', periodStart: startOfUtcDay(now) },
        { period: 'MONTHLY', periodStart: startOfUtcMonth(now) },
      ],
    },
  });
  const daily = records.find((record) => record.period === 'DAILY');
  const monthly = records.find((record) => record.period === 'MONTHLY');
  return {
    daily: { used: daily?.requests || 0, limit: AI_LIMITS.daily },
    monthly: { used: monthly?.requests || 0, limit: AI_LIMITS.monthly },
  };
}

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Production seeding is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional demo environment.');
  }

  const passwordHash = await bcrypt.hash('DemoPassword123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@budgetbrain.local' },
    update: { name: 'Demo User', passwordHash, currentBalance: 2450, expectedIncome: 3600, incomeFrequency: 'FORTNIGHTLY', safetyBuffer: 250, nextPayday: addDays(10), paydayConfirmed: true },
    create: {
      name: 'Demo User',
      email: 'demo@budgetbrain.local',
      passwordHash,
      currentBalance: 2450,
      expectedIncome: 3600,
      incomeFrequency: 'FORTNIGHTLY',
      safetyBuffer: 250,
      nextPayday: addDays(10),
      paydayConfirmed: true,
    },
  });

  await prisma.protectedCost.deleteMany({ where: { userId: user.id } });
  await prisma.recurringTransactionPattern.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.savingsGoal.deleteMany({ where: { userId: user.id } });
  await prisma.debt.deleteMany({ where: { userId: user.id } });
  await prisma.chat.deleteMany({ where: { userId: user.id } });
  await prisma.aiUsage.deleteMany({ where: { userId: user.id } });

  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: 'Housing', limit: 2100, month, color: '#5f7df7' },
      { userId: user.id, category: 'Food', limit: 900, month, color: '#e59b4a' },
      { userId: user.id, category: 'Transport', limit: 600, month, color: '#45a889' },
      { userId: user.id, category: 'Lifestyle', limit: 500, month, color: '#d7667a' },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, merchant: 'Demo salary', category: 'Income', amount: 7200, type: 'INCOME', occurredAt: new Date() },
      { userId: user.id, merchant: 'Demo rent', category: 'Housing', amount: 1850, type: 'EXPENSE', occurredAt: new Date() },
      { userId: user.id, merchant: 'Demo groceries', category: 'Food', amount: 240, type: 'EXPENSE', occurredAt: new Date() },
    ],
  });

  await prisma.protectedCost.createMany({ data: [
    { userId: user.id, name: 'Rent', category: 'HOUSING', classification: 'FIXED', amount: 950, originalAmount: 950, currency: 'AUD', frequency: 'FORTNIGHTLY', nextDueDate: addDays(5) },
    { userId: user.id, name: 'Groceries', category: 'GROCERIES', classification: 'ADJUSTABLE_ESSENTIAL', amount: 180, originalAmount: 180, currency: 'AUD', frequency: 'WEEKLY', nextDueDate: addDays(3) },
    { userId: user.id, name: 'Phone plan', category: 'UTILITIES', classification: 'FIXED', amount: 49, originalAmount: 49, currency: 'AUD', frequency: 'MONTHLY', nextDueDate: addDays(8) },
  ] });

  await prisma.savingsGoal.create({
    data: { userId: user.id, name: 'Emergency fund', target: 10000, current: 2500, monthly: 400 },
  });
  await prisma.debt.create({
    data: { userId: user.id, name: 'Demo car loan', balance: 8900, annualRate: 6.4, minimumPayment: 310 },
  });

  console.log('Created fake demo data for demo@budgetbrain.local');
};

function addDays(days) { const date = new Date(); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() + days); return date; }

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

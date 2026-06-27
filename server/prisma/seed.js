import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Production seeding is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional demo environment.');
  }

  const passwordHash = await bcrypt.hash('DemoPassword123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@budgetbrain.local' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@budgetbrain.local',
      passwordHash,
    },
  });

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

  await prisma.savingsGoal.create({
    data: { userId: user.id, name: 'Emergency fund', target: 10000, current: 2500, monthly: 400 },
  });
  await prisma.debt.create({
    data: { userId: user.id, name: 'Demo car loan', balance: 8900, annualRate: 6.4, minimumPayment: 310 },
  });

  console.log('Created fake demo data for demo@budgetbrain.local');
};

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

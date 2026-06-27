import { prisma } from '../lib/prisma.js';
import {
  connectDemoBank,
  disconnectDemoBank,
  getDemoBalances,
  getDemoTransactions,
  listDemoBankScenarios,
  syncDemoAccounts,
} from './bankProviders/mockBankProvider.js';

const demoSources = ['demo_bank', 'demo_balance'];

export function getDemoScenarios() {
  return listDemoBankScenarios();
}

export async function connectBank(userId, scenario = 'freedom') {
  const connection = await connectDemoBank(scenario);
  return syncScenario(userId, connection);
}

export async function syncAccounts(userId, scenario = 'freedom') {
  const connection = await syncDemoAccounts({ scenario });
  return syncScenario(userId, connection);
}

export async function getBalances(userId) {
  const snapshot = await prisma.transaction.findFirst({
    where: { userId, source: 'demo_balance' },
    orderBy: { createdAt: 'desc' },
  });
  return snapshot ? [{ name: snapshot.merchant, balance: Number(snapshot.amount), lastSyncedAt: snapshot.createdAt }] : [];
}

export async function getTransactions(userId) {
  return prisma.transaction.findMany({
    where: { userId, source: 'demo_bank' },
    orderBy: { occurredAt: 'desc' },
  });
}

export async function disconnectBank(userId) {
  await disconnectDemoBank();
  const deleted = await prisma.transaction.deleteMany({
    where: { userId, source: { in: demoSources } },
  });
  return { disconnected: true, removed: deleted.count };
}

async function syncScenario(userId, connection) {
  const [balances, transactions] = await Promise.all([
    getDemoBalances(connection),
    getDemoTransactions(connection),
  ]);
  const balance = balances[0]?.balance || 0;
  const syncedAt = new Date();

  await prisma.transaction.deleteMany({
    where: { userId, source: { in: demoSources } },
  });
  await prisma.transaction.createMany({
    data: [
      {
        userId,
        merchant: 'Demo bank balance',
        description: `Demo ${connection.label} balance snapshot. Balance: ${balance}. Next payday: ${connection.nextPayday}.`,
        category: 'Balance Snapshot',
        amount: balance,
        type: 'SAVING',
        occurredAt: syncedAt,
        source: 'demo_balance',
      },
      ...transactions.map((transaction) => ({
        userId,
        merchant: transaction.merchant,
        description: transaction.description,
        category: transaction.category,
        amount: Math.abs(transaction.amount),
        type: transaction.type,
        occurredAt: transaction.occurredAt,
        source: 'demo_bank',
      })),
    ],
  });

  return {
    connected: true,
    scenario: connection.scenario,
    scenarioLabel: connection.label,
    balance,
    nextPayday: connection.nextPayday,
    lastSyncedAt: syncedAt,
    confidenceLevel: 'High',
    disclaimer: connection.disclaimer,
    message: 'Demo bank connected successfully. Transactions and balance synced.',
  };
}

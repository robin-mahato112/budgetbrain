import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { YnabProvider } from './financialSources/YnabProvider.js';
import { decryptToken, encryptToken } from './tokenEncryptionService.js';
import { toPrismaTransaction } from './transactionNormalizationService.js';

const provider = new YnabProvider();
const oauthStates = new Map();

export async function ynabStatus(userId) {
  const connection = await prisma.financialConnection.findUnique({ where: { userId_provider: { userId, provider: 'YNAB' } } });
  return {
    configured: provider.configured,
    connected: connection?.status === 'CONNECTED',
    status: connection?.status || 'DISCONNECTED',
    selectedBudgetId: connection?.selectedBudgetId || null,
    displayName: connection?.displayName || null,
    lastSyncedAt: connection?.lastSyncedAt || null,
    lastError: connection?.lastError || null,
  };
}

export function startYnabConnection(userId) {
  const state = crypto.randomBytes(24).toString('base64url');
  oauthStates.set(state, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return { authorizationUrl: provider.authorizationUrl(state) };
}

export async function completeYnabConnection({ state, code }) {
  const pending = oauthStates.get(state);
  oauthStates.delete(state);
  if (!pending || pending.expiresAt < Date.now()) throw new AppError(400, 'YNAB_INVALID_STATE', 'YNAB connection request expired or is invalid');
  const tokens = await provider.exchangeCode(code);
  await prisma.financialConnection.upsert({
    where: { userId_provider: { userId: pending.userId, provider: 'YNAB' } },
    create: {
      userId: pending.userId, provider: 'YNAB', status: 'CONNECTED',
      encryptedAccessToken: encryptToken(tokens.access_token), encryptedRefreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000) : null,
    },
    update: {
      status: 'CONNECTED', encryptedAccessToken: encryptToken(tokens.access_token), encryptedRefreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000) : null, lastError: null,
    },
  });
  return `${env.CLIENT_URL}/connect-bank?ynab=connected`;
}

export async function listYnabBudgets(userId) {
  const connection = await connected(userId);
  return provider.getBudgets(decryptToken(connection.encryptedAccessToken));
}

export async function selectYnabBudget(userId, budgetId, name) {
  const connection = await connected(userId);
  const token = decryptToken(connection.encryptedAccessToken);
  const budgets = await provider.getBudgets(token);
  const selected = budgets.find((budget) => budget.id === budgetId);
  if (!selected) throw new AppError(404, 'YNAB_BUDGET_NOT_FOUND', 'Selected YNAB budget was not found');
  await prisma.financialConnection.update({
    where: { id: connection.id }, data: { selectedBudgetId: budgetId, displayName: String(name || selected.name).slice(0, 120), syncCursor: null },
  });
  return { selectedBudgetId: budgetId, displayName: name || selected.name };
}

export async function syncYnab(userId) {
  const connection = await connected(userId);
  if (!connection.selectedBudgetId) throw new AppError(400, 'YNAB_BUDGET_REQUIRED', 'Select a YNAB budget before syncing');
  const token = decryptToken(connection.encryptedAccessToken);
  logger.info({ userId }, '[YNAB] sync started');
  try {
    const [accounts, result] = await Promise.all([
      provider.getAccounts({ token, budgetId: connection.selectedBudgetId }),
      provider.getTransactions({ token, budgetId: connection.selectedBudgetId, serverKnowledge: connection.syncCursor }),
    ]);
    const accountMap = new Map();
    for (const account of accounts) {
      const saved = await prisma.externalAccount.upsert({
        where: { connectionId_externalId: { connectionId: connection.id, externalId: account.externalId } },
        create: { userId, connectionId: connection.id, externalId: account.externalId, name: account.name, currency: account.currency, closed: account.closed },
        update: { name: account.name, currency: account.currency, closed: account.closed },
      });
      accountMap.set(account.name, saved.id);
    }
    let created = 0; let updated = 0; let removed = 0;
    for (const transaction of result.transactions) {
      const data = toPrismaTransaction(userId, transaction, { externalAccountId: accountMap.get(transaction.accountName) || null });
      const { userId: ignoredUserId, ...updateData } = data;
      const existing = await prisma.transaction.findUnique({ where: { userId_source_externalId: { userId, source: 'ynab', externalId: transaction.externalId } } });
      await prisma.transaction.upsert({
        where: { userId_source_externalId: { userId, source: 'ynab', externalId: transaction.externalId } },
        create: data,
        update: updateData,
      });
      if (transaction.deleted) removed += 1;
      else if (existing) updated += 1;
      else created += 1;
    }
    const syncedAt = new Date();
    await prisma.financialConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: syncedAt, syncCursor: String(result.serverKnowledge || ''), lastError: null, status: 'CONNECTED' } });
    logger.info({ userId, retrieved: result.transactions.length, created, updated, removed }, '[YNAB] sync complete');
    return { retrieved: result.transactions.length, created, updated, removed, lastSyncedAt: syncedAt };
  } catch (error) {
    await prisma.financialConnection.update({ where: { id: connection.id }, data: { status: 'ERROR', lastError: error.message.slice(0, 500) } });
    throw error;
  }
}

export async function disconnectYnab(userId, deleteHistory = false) {
  const connection = await prisma.financialConnection.findUnique({ where: { userId_provider: { userId, provider: 'YNAB' } } });
  if (!connection) return { disconnected: true, removedTransactions: 0 };
  const removed = deleteHistory ? await prisma.transaction.deleteMany({ where: { userId, source: 'ynab' } }) : { count: 0 };
  await prisma.financialConnection.update({
    where: { id: connection.id },
    data: { status: 'DISCONNECTED', encryptedAccessToken: null, encryptedRefreshToken: null, tokenExpiresAt: null, syncCursor: null },
  });
  return { disconnected: true, removedTransactions: removed.count };
}

async function connected(userId) {
  const connection = await prisma.financialConnection.findUnique({ where: { userId_provider: { userId, provider: 'YNAB' } } });
  if (!connection || connection.status === 'DISCONNECTED' || !connection.encryptedAccessToken) throw new AppError(409, 'YNAB_NOT_CONNECTED', 'Connect YNAB first');
  return connection;
}

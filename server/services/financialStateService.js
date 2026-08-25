import { prisma } from '../lib/prisma.js';
import { merchantKey } from './categorisationService.js';
import { calculateSafeToSpend } from './safeToSpendService.js';

const money = (value) => Number(value || 0);
const DAY = 86400000;

export async function getFinancialState(userId, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, baseCurrency: true, currentBalance: true, expectedIncome: true, safetyBuffer: true,
      nextPayday: true, paydayConfirmed: true,
    },
  });
  if (!user) return null;

  const [protectedCosts, recurringPatterns, debts, recentTransactions, balanceSnapshot] = await Promise.all([
    prisma.protectedCost.findMany({ where: { userId, enabled: true }, orderBy: { nextDueDate: 'asc' } }),
    prisma.recurringTransactionPattern.findMany({ where: { userId }, orderBy: { nextExpectedAt: 'asc' } }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId, deletedAt: null, source: { not: 'demo_balance' } }, orderBy: { occurredAt: 'desc' }, take: 100 }),
    prisma.transaction.findFirst({ where: { userId, source: 'demo_balance', deletedAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  return buildFinancialState({ user, protectedCosts, recurringPatterns, debts, recentTransactions, balanceSnapshot, now });
}

export function buildFinancialState({ user, protectedCosts = [], recurringPatterns = [], debts = [], recentTransactions = [], balanceSnapshot = null, now = new Date() }) {
  const payday = validDate(user.nextPayday);
  const today = startOfDay(now);
  const daysUntilPayday = payday ? Math.max(0, Math.ceil((payday - today) / DAY)) : null;
  const availableBalance = user.currentBalance === null || user.currentBalance === undefined
    ? money(balanceSnapshot?.amount)
    : money(user.currentBalance);

  const protectedOccurrences = payday
    ? protectedCosts.flatMap((cost) => occurrencesBeforePayday(cost, today, payday))
    : [];
  const confirmedRecurring = payday
    ? recurringPatterns.filter((pattern) => pattern.protectionStatus === 'PROTECTED' && inWindow(pattern.nextExpectedAt, today, payday))
    : [];
  const obligations = [...protectedOccurrences];
  const duplicateReasons = [];

  for (const recurring of confirmedRecurring) {
    const duplicate = protectedOccurrences.find((cost) => sameObligation(cost, recurring));
    if (duplicate) {
      duplicateReasons.push(`${recurring.description} matched an existing protected cost and was counted once.`);
      continue;
    }
    obligations.push({
      id: `recurring:${recurring.id}`, recurringPatternId: recurring.id, merchant: recurring.description,
      description: recurring.description, amount: money(recurring.amount), dueDate: recurring.nextExpectedAt,
      category: 'RECURRING', kind: classifyCategory('SUBSCRIPTIONS'), source: 'RECURRING', confirmed: true,
    });
  }

  if (payday && daysUntilPayday <= 31) {
    for (const debt of debts) {
      const candidate = {
        id: `debt:${debt.id}`, merchant: debt.name, description: debt.name, amount: money(debt.minimumPayment),
        dueDate: payday, category: 'DEBT', kind: 'FIXED', source: 'DEBT', confirmed: true,
      };
      if (!obligations.some((item) => sameObligation(item, candidate))) obligations.push(candidate);
    }
  }

  const calculation = calculateSafeToSpend({
    currentBalance: availableBalance,
    confirmedIncomeBeforePayday: 0,
    obligations,
    safetyBuffer: money(user.safetyBuffer),
    daysUntilPayday,
  });
  const safeToSpend = calculation.rawSafeToSpend;
  const mode = safeToSpend < 0 ? 'RECOVERY' : 'NORMAL';
  const shortfall = Math.max(0, -safeToSpend);
  const pressure = moneyPressure({ safeToSpend, availableBalance, daysUntilPayday, protectedAmount: calculation.protectedMoney, safetyBuffer: money(user.safetyBuffer) });
  const pendingRecurring = recurringPatterns.filter((item) => item.protectionStatus === 'PENDING').length;
  const unknownTransactions = recentTransactions.filter((item) => ['Uncategorised', 'Mixed / Needs Review'].includes(item.category)).length;
  const latestTransaction = recentTransactions[0]?.createdAt || recentTransactions[0]?.occurredAt || balanceSnapshot?.createdAt || null;
  const confidence = confidenceState({
    paydayConfirmed: Boolean(payday && user.paydayConfirmed),
    protectedCount: protectedCosts.filter((item) => item.enabled).length,
    pendingRecurring,
    unknownTransactions,
    latestTransaction,
    now,
  });
  const adjustments = recoveryAdjustments(obligations, recentTransactions, shortfall);

  return {
    availableBalance,
    expectedIncome: money(user.expectedIncome),
    protectedAmount: calculation.protectedMoney,
    upcomingObligationsTotal: obligations.reduce((sum, item) => sum + money(item.amount), 0),
    safetyBuffer: money(user.safetyBuffer),
    safeToSpend,
    dailySafeToSpend: daysUntilPayday > 0 ? Math.max(0, safeToSpend) / daysUntilPayday : null,
    daysUntilPayday,
    nextPayday: payday?.toISOString().slice(0, 10) || null,
    moneyPressure: pressure.level,
    moneyPressureReasons: pressure.reasons,
    mode,
    shortfall,
    confidence: confidence.level,
    confidenceReasons: confidence.reasons,
    upcomingObligations: obligations.map(publicObligation),
    recurringNeedsReview: recurringPatterns.filter((item) => item.protectionStatus === 'PENDING').map(publicRecurring),
    duplicateReasons,
    recoveryAdjustments: adjustments,
    recentTransactions: recentTransactions.slice(0, 8).map(publicTransaction),
    calculatedAt: now.toISOString(),
  };
}

function occurrencesBeforePayday(cost, today, payday) {
  let due = validDate(cost.nextDueDate);
  if (!due) return [];
  const frequency = String(cost.frequency || 'ONE_TIME').toUpperCase();
  const results = [];
  while (due < today && frequency !== 'ONE_TIME') due = advance(due, frequency);
  if (frequency === 'ONE_TIME' && due < today) return [];
  while (inWindow(due, today, payday)) {
    results.push({
      id: `protected:${cost.id}:${due.toISOString().slice(0, 10)}`, protectedCostId: cost.id,
      recurringPatternId: cost.recurringPatternId, merchant: cost.name, description: cost.name,
      amount: money(cost.amount), originalAmount: cost.originalAmount === null ? null : money(cost.originalAmount),
      currency: cost.currency, dueDate: new Date(due), category: cost.category,
      kind: cost.classification, source: 'PROTECTED_COST', confirmed: true,
    });
    if (frequency === 'ONE_TIME') break;
    due = advance(due, frequency);
  }
  return results;
}

function sameObligation(left, right) {
  if (left.recurringPatternId && right.recurringPatternId && left.recurringPatternId === right.recurringPatternId) return true;
  const leftName = merchantKey(left.merchant || left.description);
  const rightName = merchantKey(right.merchant || right.description);
  const nameMatch = leftName && rightName && (leftName.includes(rightName) || rightName.includes(leftName));
  const maxAmount = Math.max(money(left.amount), money(right.amount), 1);
  const amountMatch = Math.abs(money(left.amount) - money(right.amount)) / maxAmount <= 0.1;
  const leftDate = validDate(left.dueDate); const rightDate = validDate(right.dueDate);
  const dateMatch = !leftDate || !rightDate || Math.abs(leftDate - rightDate) <= 3 * DAY;
  return Boolean(nameMatch && amountMatch && dateMatch);
}

function moneyPressure({ safeToSpend, availableBalance, daysUntilPayday, protectedAmount, safetyBuffer }) {
  const reasons = [`${formatMoney(safeToSpend)} safe to spend`, daysUntilPayday === null ? 'Payday is not set' : `${daysUntilPayday} days until payday`, `${formatMoney(protectedAmount)} protected before payday`];
  if (safeToSpend < 0) return { level: 'CRITICAL', reasons: [...reasons, `${formatMoney(Math.abs(safeToSpend))} projected shortfall`] };
  const ratio = availableBalance > 0 ? safeToSpend / availableBalance : 0;
  const daily = daysUntilPayday > 0 ? safeToSpend / daysUntilPayday : safeToSpend;
  if (safeToSpend === 0 || ratio < 0.05 || (daysUntilPayday >= 7 && daily < 10)) return { level: 'HIGH', reasons };
  if (ratio < 0.2 || (daysUntilPayday >= 5 && daily < 25) || safetyBuffer === 0) return { level: 'MEDIUM', reasons: safetyBuffer === 0 ? [...reasons, 'No safety buffer configured'] : reasons };
  return { level: 'LOW', reasons };
}

function confidenceState({ paydayConfirmed, protectedCount, pendingRecurring, unknownTransactions, latestTransaction, now }) {
  const ageDays = latestTransaction ? (now - new Date(latestTransaction)) / DAY : Infinity;
  const checks = [
    [paydayConfirmed, 'Payday confirmed', 'Payday is missing or unconfirmed'],
    [protectedCount > 0, `${protectedCount} protected costs configured`, 'No protected costs configured'],
    [ageDays <= 7, 'Transactions updated recently', 'Transaction data is stale or missing'],
    [protectedCount > 0 && pendingRecurring === 0, 'Recurring payments reviewed', pendingRecurring ? `${pendingRecurring} recurring payments need review` : 'Recurring review needs financial data'],
    [Boolean(latestTransaction) && unknownTransactions === 0, 'No major unknown transactions', unknownTransactions ? `${unknownTransactions} transactions need categorisation` : 'Transaction categorisation needs current data'],
  ];
  const score = checks.filter(([ok]) => ok).length;
  return { level: score >= 4 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW', reasons: checks.map(([ok, yes, no]) => ok ? yes : no) };
}

function recoveryAdjustments(obligations, transactions, shortfall) {
  if (!shortfall) return [];
  const candidates = [
    ...obligations.filter((item) => item.kind === 'OPTIONAL').map((item) => ({ label: item.description, amount: money(item.amount), classification: 'OPTIONAL' })),
    ...obligations.filter((item) => item.kind === 'ADJUSTABLE_ESSENTIAL').map((item) => ({ label: item.description, amount: Number((money(item.amount) * 0.15).toFixed(2)), classification: 'ADJUSTABLE_ESSENTIAL' })),
  ];
  const discretionary = transactions.filter((item) => ['Dining', 'Subscriptions', 'Other'].includes(item.category) && item.type === 'EXPENSE').reduce((sum, item) => sum + money(item.amount), 0);
  if (discretionary > 0) candidates.push({ label: 'Pause discretionary spending', amount: Math.min(discretionary, shortfall), classification: 'OPTIONAL' });
  let remaining = shortfall;
  return candidates.map((item) => { const usable = Math.min(item.amount, remaining); remaining = Math.max(0, remaining - usable); return { ...item, amount: usable, remainingGap: remaining }; }).filter((item) => item.amount > 0);
}

function publicObligation(item) { return { id: item.id, protectedCostId: item.protectedCostId || null, recurringPatternId: item.recurringPatternId || null, name: item.description, amount: money(item.amount), originalAmount: item.originalAmount, currency: item.currency || 'AUD', dueDate: validDate(item.dueDate)?.toISOString().slice(0, 10), category: item.category, classification: item.kind, source: item.source }; }
function publicRecurring(item) { return { id: item.id, description: item.description, amount: money(item.amount), currency: item.currency, cadence: item.cadence, nextExpectedAt: item.nextExpectedAt, confidence: money(item.confidence), protectionStatus: item.protectionStatus }; }
function publicTransaction(item) { return { id: item.id, merchant: item.merchant, description: item.description, category: item.category, amount: item.type === 'INCOME' ? money(item.amount) : -money(item.amount), type: item.type.toLowerCase(), occurredAt: item.occurredAt, source: item.source }; }
function classifyCategory(category) { return ['SUBSCRIPTIONS'].includes(category) ? 'OPTIONAL' : ['GROCERIES', 'TRANSPORT'].includes(category) ? 'ADJUSTABLE_ESSENTIAL' : 'FIXED'; }
function inWindow(value, start, end) { const date = validDate(value); return Boolean(date && date >= start && date <= end); }
function validDate(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : startOfDay(date); }
function startOfDay(value) { const date = new Date(value); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function advance(value, frequency) { const date = new Date(value); if (frequency === 'WEEKLY') date.setUTCDate(date.getUTCDate() + 7); else if (frequency === 'FORTNIGHTLY') date.setUTCDate(date.getUTCDate() + 14); else if (frequency === 'MONTHLY') date.setUTCMonth(date.getUTCMonth() + 1); else if (frequency === 'QUARTERLY') date.setUTCMonth(date.getUTCMonth() + 3); else if (frequency === 'YEARLY') date.setUTCFullYear(date.getUTCFullYear() + 1); else return new Date('invalid'); return date; }
function formatMoney(value) { const sign = value < 0 ? '-' : ''; return `${sign}$${Math.abs(value).toFixed(2)}`; }

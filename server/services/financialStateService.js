import { prisma } from '../lib/prisma.js';
import { merchantKey } from './categorisationService.js';
import { calculateSafeToSpend } from './safeToSpendService.js';
import { day, occurrenceDates, MAX_FORECAST_DAYS } from './scheduleService.js';

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
  const daysUntilPayday = payday ? Math.ceil((payday - today) / DAY) : null;
  const validWindow = daysUntilPayday !== null && daysUntilPayday >= 0 && daysUntilPayday <= MAX_FORECAST_DAYS;
  const currency = user.baseCurrency || 'AUD';
  const balanceKnown = user.currentBalance !== null && user.currentBalance !== undefined || Boolean(balanceSnapshot);
  const availableBalance = user.currentBalance === null || user.currentBalance === undefined
    ? money(balanceSnapshot?.amount)
    : money(user.currentBalance);

  const protectedOccurrences = validWindow
    ? protectedCosts.filter((cost) => cost.enabled !== false).flatMap((cost) => occurrencesBeforePayday(cost, today, payday))
    : [];
  const confirmedRecurring = validWindow
    ? recurringPatterns.filter((pattern) => pattern.protectionStatus === 'PROTECTED' && (!pattern.currency || pattern.currency === currency)).flatMap((pattern) => occurrenceDates(pattern.nextExpectedAt, pattern.cadence, today, payday).map((dueDate) => ({ ...pattern, dueDate, recurringPatternId: pattern.id })))
    : [];
  const obligations = [...protectedOccurrences];
  const duplicateReasons = [];

  for (const recurring of confirmedRecurring) {
    const duplicate = protectedOccurrences.find((cost) => cost.kind !== 'OPTIONAL' && sameObligation(cost, recurring));
    if (duplicate) {
      duplicateReasons.push(`${recurring.description} matched an existing protected cost and was counted once.`);
      continue;
    }
    obligations.push({
      id: `recurring:${recurring.id}:${recurring.dueDate.toISOString().slice(0, 10)}`, recurringPatternId: recurring.id, merchant: recurring.description,
      description: recurring.description, amount: money(recurring.amount), dueDate: recurring.dueDate, currency,
      category: 'RECURRING', kind: 'FIXED', source: 'RECURRING', confirmed: true,
    });
  }

  if (validWindow && daysUntilPayday <= 31) {
    for (const debt of debts) {
      const candidate = {
        id: `debt:${debt.id}`, merchant: debt.name, description: debt.name, amount: money(debt.minimumPayment),
        dueDate: payday, category: 'DEBT', kind: 'FIXED', source: 'DEBT', confirmed: true, estimatedDate: true,
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
  const safeToSpend = round(calculation.rawSafeToSpend);
  const protectedCount = protectedCosts.filter((item) => item.enabled !== false && item.classification !== 'OPTIONAL').length + recurringPatterns.filter((item) => item.protectionStatus === 'PROTECTED').length;
  const checks = [
    { id: 'balance', ok: balanceKnown, label: balanceKnown ? 'Current balance entered' : 'Enter your current balance', href: '/payday-setup' },
    { id: 'payday', ok: validWindow && Boolean(user.paydayConfirmed), label: validWindow && user.paydayConfirmed ? 'Upcoming payday confirmed' : 'Confirm your next payday', href: '/payday-setup' },
    { id: 'essentials', ok: protectedCount > 0, label: protectedCount > 0 ? 'Essential costs configured' : 'Add your essential costs', href: '/protected-essentials' },
    { id: 'currency', ok: !recurringPatterns.some((item) => item.protectionStatus === 'PROTECTED' && item.currency && item.currency !== currency), label: 'Review recurring payments in another currency', href: '/protected-essentials' },
  ];
  const ready = checks.every((item) => item.ok);
  const mode = !ready ? 'SETUP' : safeToSpend < 0 ? 'RECOVERY' : 'NORMAL';
  const shortfall = Math.max(0, -safeToSpend);
  const pressure = moneyPressure({ safeToSpend, availableBalance, daysUntilPayday, protectedAmount: calculation.protectedMoney, safetyBuffer: money(user.safetyBuffer) });
  const pendingRecurring = recurringPatterns.filter((item) => item.protectionStatus === 'PENDING').length;
  const unknownTransactions = recentTransactions.filter((item) => ['Uncategorised', 'Mixed / Needs Review'].includes(item.category)).length;
  const latestTransaction = recentTransactions[0]?.createdAt || recentTransactions[0]?.occurredAt || balanceSnapshot?.createdAt || null;
  const confidence = confidenceState({
    paydayConfirmed: validWindow && Boolean(user.paydayConfirmed),
    protectedCount,
    pendingRecurring,
    unknownTransactions,
    latestTransaction,
    now,
  });
  const adjustments = recoveryAdjustments(calculation.obligations, shortfall);

  return {
    currency,
    readiness: { ready, checks },
    balanceSource: user.currentBalance !== null && user.currentBalance !== undefined ? 'MANUAL' : balanceSnapshot ? 'DEMO' : 'MISSING',
    assumptions: ['Current balance is a snapshot: reconcile it in Payday Setup after spending or importing history.', 'Expected payday income is not available to spend today.', ...(debts.length ? ['Debt minimums are estimated at payday because debt due dates are not yet recorded.'] : [])],
    availableBalance,
    expectedIncome: money(user.expectedIncome),
    protectedAmount: round(calculation.protectedMoney),
    upcomingObligationsTotal: round(calculation.obligations.reduce((sum, item) => sum + money(item.amount), 0)),
    safetyBuffer: money(user.safetyBuffer),
    safeToSpend,
    dailySafeToSpend: ready && daysUntilPayday > 0 ? Math.floor(Math.max(0, safeToSpend) * 100 / daysUntilPayday) / 100 : null,
    daysUntilPayday,
    nextPayday: payday?.toISOString().slice(0, 10) || null,
    moneyPressure: ready ? pressure.level : 'UNKNOWN',
    moneyPressureReasons: pressure.reasons,
    mode,
    shortfall,
    confidence: ready ? confidence.level : 'LOW',
    confidenceReasons: confidence.reasons,
    confidenceChecks: confidence.checks,
    upcomingObligations: calculation.obligations.map(publicObligation).sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    recurringNeedsReview: recurringPatterns.filter((item) => item.protectionStatus === 'PENDING').map(publicRecurring),
    duplicateReasons,
    recoveryAdjustments: adjustments,
    recentTransactions: recentTransactions.slice(0, 8).map(publicTransaction),
    calculatedAt: now.toISOString(),
  };
}

function occurrencesBeforePayday(cost, today, payday) {
  return occurrenceDates(cost.nextDueDate, cost.frequency || 'ONE_TIME', today, payday).map((due) => ({
      id: `protected:${cost.id}:${due.toISOString().slice(0, 10)}`, protectedCostId: cost.id,
      recurringPatternId: cost.recurringPatternId, merchant: cost.name, description: cost.name,
      amount: money(cost.amount), originalAmount: cost.originalAmount === null ? null : money(cost.originalAmount),
      currency: cost.currency, dueDate: new Date(due), category: cost.category,
      kind: cost.classification, source: 'PROTECTED_COST', confirmed: true,
    }));
}

function sameObligation(left, right) {
  const linked = left.recurringPatternId && left.recurringPatternId === right.recurringPatternId;
  const leftName = merchantKey(left.merchant || left.description);
  const rightName = merchantKey(right.merchant || right.description);
  const nameMatch = leftName && rightName && (leftName.includes(rightName) || rightName.includes(leftName));
  const maxAmount = Math.max(money(left.amount), money(right.amount), 1);
  const amountMatch = Math.abs(money(left.amount) - money(right.amount)) / maxAmount <= 0.1;
  const leftDate = validDate(left.dueDate); const rightDate = validDate(right.dueDate);
  const dateMatch = !leftDate || !rightDate || Math.abs(leftDate - rightDate) <= 3 * DAY;
  return Boolean((linked || nameMatch && amountMatch) && dateMatch);
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
  return { level: score >= 4 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW', reasons: checks.map(([ok, yes, no]) => ok ? yes : no), checks: checks.map(([ok, yes, no]) => ({ ok: Boolean(ok), label: ok ? yes : no })) };
}

function recoveryAdjustments(obligations, shortfall) {
  if (!shortfall) return [];
  const candidates = [
    ...obligations.filter((item) => item.kind === 'ADJUSTABLE_ESSENTIAL').map((item) => ({ label: item.description, amount: Number((money(item.amount) * 0.15).toFixed(2)), classification: 'ADJUSTABLE_ESSENTIAL' })),
  ];
  // Past spending is not recoverable cash; do not claim that pausing it closes today's gap.
  let remaining = shortfall;
  return candidates.map((item) => { const usable = Math.min(item.amount, remaining); remaining = Math.max(0, remaining - usable); return { ...item, amount: usable, remainingGap: remaining }; }).filter((item) => item.amount > 0);
}

function publicObligation(item) { return { id: item.id, protectedCostId: item.protectedCostId || null, recurringPatternId: item.recurringPatternId || null, name: item.description, amount: money(item.amount), originalAmount: item.originalAmount, currency: item.currency || 'AUD', dueDate: validDate(item.dueDate)?.toISOString().slice(0, 10), category: item.category, classification: item.kind, source: item.source, estimatedDate: Boolean(item.estimatedDate) }; }
function publicRecurring(item) { return { id: item.id, description: item.description, amount: money(item.amount), currency: item.currency, cadence: item.cadence, nextExpectedAt: item.nextExpectedAt, confidence: money(item.confidence), protectionStatus: item.protectionStatus }; }
function publicTransaction(item) { return { id: item.id, merchant: item.merchant, description: item.description, category: item.category, amount: item.type === 'INCOME' ? money(item.amount) : -money(item.amount), type: item.type.toLowerCase(), occurredAt: item.occurredAt, source: item.source }; }
function validDate(value) { return day(value); }
function startOfDay(value) { const date = new Date(value); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function formatMoney(value) { const sign = value < 0 ? '-' : ''; return `${sign}$${Math.abs(value).toFixed(2)}`; }

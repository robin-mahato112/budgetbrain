import { merchantKey } from './categorisationService.js';

export function detectRecurringTransactions(transactions, options = {}) {
  const groups = new Map();
  for (const item of transactions.filter((transaction) => String(transaction.type || transaction.direction).toUpperCase() === 'EXPENSE')) {
    const key = merchantKey(item.merchant || item.description);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const patterns = [];
  for (const [key, items] of groups) {
    if (items.length < 3) continue;
    const sorted = [...items].sort((a, b) => new Date(a.occurredAt || a.transactionDate) - new Date(b.occurredAt || b.transactionDate));
    const amounts = sorted.map((item) => Math.abs(Number(item.amount)));
    const averageAmount = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
    const amountVariation = Math.max(...amounts.map((value) => Math.abs(value - averageAmount) / Math.max(averageAmount, 1)));
    const intervals = sorted.slice(1).map((item, index) => Math.round((new Date(item.occurredAt || item.transactionDate) - new Date(sorted[index].occurredAt || sorted[index].transactionDate)) / 86400000));
    const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const cadence = cadenceFor(averageInterval);
    if (!cadence || amountVariation > (options.amountTolerance || 0.15)) continue;
    const intervalVariation = Math.max(...intervals.map((value) => Math.abs(value - averageInterval)));
    if (intervalVariation > (cadence === 'WEEKLY' ? 3 : 7)) continue;
    const nextExpectedAt = new Date(sorted.at(-1).occurredAt || sorted.at(-1).transactionDate);
    nextExpectedAt.setUTCDate(nextExpectedAt.getUTCDate() + Math.round(averageInterval));
    patterns.push({
      merchantKey: key, description: sorted.at(-1).merchant || sorted.at(-1).description,
      amount: Number(averageAmount.toFixed(2)), currency: sorted.at(-1).currency || 'AUD', cadence,
      nextExpectedAt, confidence: Number(Math.max(0.5, 1 - amountVariation - intervalVariation / 30).toFixed(3)),
      protectionStatus: 'PENDING', occurrences: sorted.length,
    });
  }
  return patterns;
}

function cadenceFor(days) {
  if (days >= 5 && days <= 9) return 'WEEKLY';
  if (days >= 12 && days <= 17) return 'FORTNIGHTLY';
  if (days >= 25 && days <= 35) return 'MONTHLY';
  return null;
}

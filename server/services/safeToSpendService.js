const amount = (value) => Math.max(0, Number(value || 0));

export function calculateSafeToSpend(input) {
  const currentBalance = Number(input.currentBalance || 0);
  const confirmedIncome = amount(input.confirmedIncomeBeforePayday);
  const protectedEssentials = deduplicateObligations((input.obligations || []).filter((item) => ['FIXED', 'ESSENTIAL', 'ADJUSTABLE_ESSENTIAL'].includes(item.kind)));
  const protectedMoney = protectedEssentials.reduce((sum, item) => sum + amount(item.convertedAmount ?? item.amount), 0) + amount(input.safetyBuffer);
  const availableMoney = currentBalance + confirmedIncome;
  const rawSafeToSpend = availableMoney - protectedMoney;
  const daysUntilPayday = Math.max(0, Number(input.daysUntilPayday || 0));
  const safeToSpend = Math.max(0, rawSafeToSpend);
  const recoveryGap = Math.max(0, -rawSafeToSpend);
  return {
    availableMoney,
    protectedMoney,
    safeToSpend,
    rawSafeToSpend,
    recoveryGap,
    dailySafeToSpend: daysUntilPayday > 0 ? safeToSpend / daysUntilPayday : null,
    daysUntilPayday,
    mode: recoveryGap > 0 ? 'RECOVERY' : 'NORMAL',
    obligations: protectedEssentials,
  };
}

export function deduplicateObligations(obligations) {
  const selected = new Map();
  for (const item of obligations) {
    const key = item.linkedTransactionId
      ? `transaction:${item.linkedTransactionId}`
      : `${normalize(item.merchant || item.description)}:${Number(item.convertedAmount ?? item.amount ?? 0).toFixed(2)}:${dateKey(item.dueDate)}`;
    const existing = selected.get(key);
    if (!existing || (item.confirmed && !existing.confirmed)) selected.set(key, item);
  }
  return [...selected.values()];
}

export function calculateConfidence(input) {
  const checks = [
    { ok: Boolean(input.transactionsCurrent), label: 'Transactions updated recently' },
    { ok: Boolean(input.paydayConfirmed), label: 'Payday confirmed' },
    { ok: Number(input.confirmedEssentials || 0) > 0, label: 'Protected essentials confirmed' },
    { ok: Number(input.unconfirmedObligations || 0) === 0, label: 'Upcoming payments reviewed' },
    { ok: Number(input.uncategorisedTransactions || 0) === 0, label: 'Transactions categorised' },
  ];
  const score = checks.filter((item) => item.ok).length / checks.length;
  return { level: score >= 0.8 ? 'HIGH' : score >= 0.5 ? 'MEDIUM' : 'LOW', score, checks };
}

function normalize(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function dateKey(value) {
  if (!value) return 'undated';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value).toLowerCase() : parsed.toISOString().slice(0, 10);
}

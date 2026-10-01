// Purchase decisions use the same persisted state as the dashboard.
export function assessPurchase(state, amount) {
  if (!state.readiness?.ready) return { ok: true, affordable: false, mode: 'Setup Needed', remainingGuiltFree: 0, recoveryGap: 0, message: 'Complete payday setup and review your essentials before checking a purchase.' };
  const remaining = Math.round((state.safeToSpend - amount) * 100) / 100;
  const mode = state.mode === 'RECOVERY' ? 'Recovery Mode' : state.moneyPressure === 'HIGH' ? 'Watch Mode' : 'Freedom Mode';
  const format = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: state.currency || 'AUD' }).format(value);
  return {
    ok: true, affordable: remaining >= 0, mode,
    remainingGuiltFree: Math.max(0, remaining), recoveryGap: Math.max(0, -remaining),
    safeToSpendBefore: state.safeToSpend, safeToSpendAfter: remaining, currency: state.currency,
    message: remaining >= 0
      ? `This fits within your safe-to-spend estimate. You would have ${format(remaining)} left before payday.`
      : `This purchase would leave a ${format(-remaining)} shortfall after protected costs. Review your plan before spending.`,
  };
}

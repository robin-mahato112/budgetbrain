export function applyFinancialState(insights, state) {
  if (!state) return insights;
  const setup = !state.readiness.ready;
  const recovery = !setup && state.mode === 'RECOVERY';
  const watch = !setup && !recovery && state.moneyPressure === 'HIGH';
  const name = setup ? 'Setup Needed' : recovery ? 'Recovery Mode' : watch ? 'Watch Mode' : 'Freedom Mode';
  const action = setup ? 'Confirm your balance, upcoming payday, and essential costs.' : recovery ? 'Review upcoming adjustable costs and the remaining shortfall.' : 'Review the bills behind your estimate before spending.';
  return {
    ...insights,
    moneyMode: {
      ...insights.moneyMode, name, status: setup ? 'setup' : recovery ? 'recovery' : watch ? 'watch' : 'freedom',
      message: action, currentBalance: state.availableBalance, protectedMoney: state.protectedAmount,
      protectedMoneyMissing: setup, guiltFreeSpending: setup ? 0 : Math.max(0, state.safeToSpend),
      recoveryGap: state.shortfall, suggestedSpendingLimit: setup ? 0 : Math.max(0, state.safeToSpend), nextPayday: state.nextPayday || 'Not set',
      pauseOrReduce: state.recoveryAdjustments.map((item) => `${item.label}: review a possible ${item.amount.toFixed(2)} reduction`),
    },
    confidence: { level: title(state.confidence), checks: state.confidenceChecks, reason: state.confidenceReasons.join(' · ') },
    moneyPressure: { level: title(state.moneyPressure), reason: setup ? action : state.moneyPressureReasons.join(' · '), action },
    futureCashflow: { committedBeforePayday: state.upcomingObligationsTotal, items: state.upcomingObligations.map((item) => ({ label: item.name, amount: item.amount, dueDate: item.dueDate })), warning: setup ? action : '' },
  };
}
function title(value) { return value[0] + value.slice(1).toLowerCase(); }

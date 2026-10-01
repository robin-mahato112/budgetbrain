export const financialStateFixture = {
  currency: 'AUD', availableBalance: 1000, safeToSpend: 300, protectedAmount: 700, safetyBuffer: 100,
  upcomingObligationsTotal: 600, shortfall: 0, mode: 'NORMAL', nextPayday: '2026-10-09',
  readiness: { ready: true, checks: [] }, moneyPressure: 'LOW', moneyPressureReasons: ['300 available'],
  confidence: 'HIGH', confidenceReasons: ['Payday confirmed'], confidenceChecks: [{ ok: true, label: 'Payday confirmed' }],
  upcomingObligations: [], recurringNeedsReview: [], recoveryAdjustments: [],
};

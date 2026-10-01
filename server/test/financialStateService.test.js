import { describe, expect, it } from 'vitest';
import { buildFinancialState } from '../services/financialStateService.js';
import { occurrenceDates } from '../services/scheduleService.js';
import { assessPurchase } from '../services/purchaseAssessmentService.js';

const now = new Date('2026-08-25T12:00:00.000Z');
const user = { currentBalance: 1000, expectedIncome: 2000, safetyBuffer: 100, nextPayday: new Date('2026-09-04'), paydayConfirmed: true };
const cost = (overrides = {}) => ({ id: 'cost-1', name: 'Rent', amount: 400, originalAmount: 400, currency: 'AUD', category: 'HOUSING', classification: 'FIXED', frequency: 'ONE_TIME', nextDueDate: new Date('2026-08-30'), enabled: true, ...overrides });
const recent = [{ id: 'tx-1', merchant: 'Market', description: 'Market', category: 'Groceries', amount: 20, type: 'EXPENSE', occurredAt: now, createdAt: now, source: 'manual' }];

function build(overrides = {}) {
  return buildFinancialState({ user, protectedCosts: [cost()], recurringPatterns: [], debts: [], recentTransactions: recent, now, ...overrides });
}

describe('authoritative financial state', () => {
  it('protects each confirmed recurring occurrence and excludes ignored candidates', () => {
    const pattern = { id: 'phone', description: 'Phone', amount: 30, currency: 'AUD', cadence: 'WEEKLY', nextExpectedAt: '2026-08-26', protectionStatus: 'PROTECTED' };
    const state = build({ recurringPatterns: [pattern, { ...pattern, id: 'ignored', description: 'Ignored', protectionStatus: 'IGNORED' }] });
    expect(state.protectedAmount).toBe(560);
    expect(state.safeToSpend).toBe(440);
    expect(state.upcomingObligations.filter((item) => item.source === 'RECURRING')).toHaveLength(2);
  });

  it('does not deduplicate two different weeks of a linked recurring bill', () => {
    const state = build({ protectedCosts: [cost({ recurringPatternId: 'rent', frequency: 'ONE_TIME', nextDueDate: '2026-08-26' })], recurringPatterns: [{ id: 'rent', description: 'Rent', amount: 400, cadence: 'WEEKLY', nextExpectedAt: '2026-08-26', protectionStatus: 'PROTECTED' }] });
    expect(state.upcomingObligations).toHaveLength(2);
    expect(state.safeToSpend).toBe(100);
  });

  it('does not let an optional duplicate cancel explicitly protected recurrence', () => {
    const state = build({ protectedCosts: [cost({ classification: 'OPTIONAL' })], recurringPatterns: [{ id: 'rent', description: 'Rent', amount: 400, cadence: 'MONTHLY', nextExpectedAt: '2026-08-30', protectionStatus: 'PROTECTED' }] });
    expect(state.protectedAmount).toBe(500);
    expect(state.upcomingObligations).toHaveLength(1);
  });

  it.each([null, '2026-08-24', '2030-01-01'])('blocks spending guidance for invalid payday window %s', (nextPayday) => {
    const state = build({ user: { ...user, nextPayday } });
    expect(state.mode).toBe('SETUP');
    expect(state.readiness.ready).toBe(false);
    expect(state.confidence).toBe('LOW');
    expect(assessPurchase(state, 1).affordable).toBe(false);
  });

  it('excludes disabled and optional costs from protected totals and the displayed breakdown', () => {
    const state = build({ protectedCosts: [cost(), cost({ id: 'paused', amount: 80, enabled: false }), cost({ id: 'optional', amount: 20, classification: 'OPTIONAL' })] });
    expect(state.upcomingObligationsTotal).toBe(400);
    expect(state.upcomingObligations).toHaveLength(1);
    expect(state.protectedAmount).toBe(state.upcomingObligationsTotal + state.safetyBuffer);
  });

  it('does not offer past spending as cash that can close a shortfall', () => {
    const state = build({ user: { ...user, currentBalance: 50 }, recentTransactions: [{ ...recent[0], category: 'Dining', amount: 100 }] });
    expect(state.recoveryAdjustments).toEqual([]);
  });

  it('uses exactly the displayed allowance when assessing a purchase', () => {
    const state = build();
    expect(assessPurchase(state, 500)).toMatchObject({ affordable: true, remainingGuiltFree: 0 });
    expect(assessPurchase(state, 500.01)).toMatchObject({ affordable: false, recoveryGap: 0.01 });
  });

  it('preserves month-end anchors and leap-year dates', () => {
    expect(occurrenceDates('2026-01-31', 'MONTHLY', '2026-02-01', '2026-04-30').map((value) => value.toISOString().slice(0, 10))).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(occurrenceDates('2024-02-29', 'YEARLY', '2025-01-01', '2025-12-31')[0].toISOString().slice(0, 10)).toBe('2025-02-28');
  });

  it('fast-forwards old schedules and bounds unreasonable forecast windows', () => {
    expect(occurrenceDates('1900-01-01', 'WEEKLY', '2026-08-25', '2026-09-04')).toHaveLength(1);
    expect(occurrenceDates('1900-01-01', 'WEEKLY', '2026-08-25', '2099-01-01')).toEqual([]);
  });

  it('blocks a mixed-currency recurring estimate until reviewed', () => {
    const state = build({ recurringPatterns: [{ id: 'usd', currency: 'USD', amount: 50, protectionStatus: 'PROTECTED', cadence: 'MONTHLY', nextExpectedAt: '2026-08-30' }] });
    expect(state.readiness.ready).toBe(false);
    expect(state.readiness.checks.find((item) => item.id === 'currency').ok).toBe(false);
  });

  it('subtracts only obligations due on or before payday and the safety buffer', () => {
    const state = build({ protectedCosts: [cost(), cost({ id: 'later', name: 'Later bill', amount: 900, nextDueDate: new Date('2026-09-05') })] });
    expect(state.protectedAmount).toBe(500);
    expect(state.safeToSpend).toBe(500);
    expect(state.mode).toBe('NORMAL');
  });

  it('preserves a negative safe-to-spend value and enters recovery mode', () => {
    const state = build({ user: { ...user, currentBalance: 200 }, protectedCosts: [cost()] });
    expect(state.safeToSpend).toBe(-300);
    expect(state.shortfall).toBe(300);
    expect(state.moneyPressure).toBe('CRITICAL');
    expect(state.mode).toBe('RECOVERY');
  });

  it('projects weekly costs through payday and includes adjustable essentials', () => {
    const state = build({ protectedCosts: [cost({ frequency: 'WEEKLY', amount: 100, nextDueDate: new Date('2026-08-26'), classification: 'ADJUSTABLE_ESSENTIAL' })] });
    expect(state.upcomingObligations).toHaveLength(2);
    expect(state.protectedAmount).toBe(300);
  });

  it('counts protected recurring candidates, ignores pending ones, and deduplicates matches', () => {
    const recurring = { id: 'rec-1', description: 'Rent', amount: 400, currency: 'AUD', cadence: 'MONTHLY', nextExpectedAt: new Date('2026-08-30'), confidence: 0.95, protectionStatus: 'PROTECTED' };
    const state = build({ recurringPatterns: [recurring, { ...recurring, id: 'pending', description: 'Streaming', amount: 20, protectionStatus: 'PENDING' }] });
    expect(state.upcomingObligations).toHaveLength(1);
    expect(state.duplicateReasons).toHaveLength(1);
    expect(state.recurringNeedsReview).toHaveLength(1);
  });

  it('returns zero exactly when available money equals protected money', () => {
    const state = build({ user: { ...user, currentBalance: 500 } });
    expect(state.safeToSpend).toBe(0);
    expect(state.moneyPressure).toBe('HIGH');
  });

  it('lowers confidence when payday, protected costs, and current transactions are missing', () => {
    const state = build({ user: { ...user, nextPayday: null, paydayConfirmed: false }, protectedCosts: [], recentTransactions: [] });
    expect(state.confidence).toBe('LOW');
    expect(state.nextPayday).toBeNull();
  });
});

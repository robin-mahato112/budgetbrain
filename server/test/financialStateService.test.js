import { describe, expect, it } from 'vitest';
import { buildFinancialState } from '../services/financialStateService.js';

const now = new Date('2026-08-25T12:00:00.000Z');
const user = { currentBalance: 1000, expectedIncome: 2000, safetyBuffer: 100, nextPayday: new Date('2026-09-04'), paydayConfirmed: true };
const cost = (overrides = {}) => ({ id: 'cost-1', name: 'Rent', amount: 400, originalAmount: 400, currency: 'AUD', category: 'HOUSING', classification: 'FIXED', frequency: 'ONE_TIME', nextDueDate: new Date('2026-08-30'), enabled: true, ...overrides });
const recent = [{ id: 'tx-1', merchant: 'Market', description: 'Market', category: 'Groceries', amount: 20, type: 'EXPENSE', occurredAt: now, createdAt: now, source: 'manual' }];

function build(overrides = {}) {
  return buildFinancialState({ user, protectedCosts: [cost()], recurringPatterns: [], debts: [], recentTransactions: recent, now, ...overrides });
}

describe('authoritative financial state', () => {
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

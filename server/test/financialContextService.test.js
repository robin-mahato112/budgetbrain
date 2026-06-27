import { describe, expect, it } from 'vitest';
import { buildAiFinancialContext, buildMonthlyInsights, evaluatePurchase } from '../services/financialContextService.js';

const tx = (merchant, category, amount, type = 'EXPENSE') => ({
  merchant,
  category,
  amount,
  type,
  source: 'csv',
  occurredAt: new Date(),
});

const balance = (amount, label = 'Freedom Demo') => ({
  merchant: 'Demo bank balance',
  category: 'Balance Snapshot',
  amount,
  type: 'SAVING',
  source: 'demo_balance',
  occurredAt: new Date(),
  createdAt: new Date(),
  description: `Demo ${label} balance snapshot. Balance: ${amount}. Next payday: Friday.`,
});

describe('financial mode logic', () => {
  it('calculates Freedom Mode with protected money and guilt-free spending', () => {
    const insights = buildMonthlyInsights([
      tx('Salary', 'Income', 2000, 'INCOME'),
      tx('Rent', 'Housing', 500),
      tx('Groceries', 'Groceries', 100),
      tx('Train', 'Transport', 30),
    ], { goals: [{ name: 'Emergency fund', current: 1200 }] });

    expect(insights.moneyMode).toMatchObject({
      name: 'Freedom Mode',
      protectedMoney: 630,
      guiltFreeSpending: 740,
      recoveryGap: 0,
    });
  });

  it('calculates Watch Mode when safe-to-spend is low', () => {
    const insights = buildMonthlyInsights([
      tx('Salary', 'Income', 5000, 'INCOME'),
      tx('Rent', 'Housing', 600),
      tx('Dining', 'Dining', 3600),
    ], { goals: [{ name: 'Emergency fund', current: 200 }] });

    expect(insights.moneyMode.name).toBe('Watch Mode');
    expect(insights.moneyMode.guiltFreeSpending).toBe(200);
    expect(insights.moneyMode.reasons.join(' ')).toContain('Safe-to-spend money is low');
  });

  it('calculates Recovery Mode and recovery gap when balance is negative', () => {
    const insights = buildMonthlyInsights([
      tx('Salary', 'Income', 2000, 'INCOME'),
      tx('Rent', 'Housing', 500),
      tx('Groceries', 'Groceries', 200),
      tx('Shopping', 'Other', 1500),
    ]);

    expect(insights.moneyMode).toMatchObject({
      name: 'Recovery Mode',
      guiltFreeSpending: 0,
      recoveryGap: 900,
    });
    expect(insights.moneyMode.survivalPriorities).toContain('Housing / rent');
  });

  it('answers Can I afford this by mode', () => {
    const freedom = buildMonthlyInsights([
      tx('Salary', 'Income', 2000, 'INCOME'),
      tx('Rent', 'Housing', 500),
    ], { goals: [{ name: 'Emergency fund', current: 1200 }] });
    const watch = buildMonthlyInsights([
      tx('Salary', 'Income', 5000, 'INCOME'),
      tx('Rent', 'Housing', 600),
      tx('Dining', 'Dining', 3600),
    ]);
    const recovery = buildMonthlyInsights([
      tx('Salary', 'Income', 2000, 'INCOME'),
      tx('Rent', 'Housing', 500),
      tx('Shopping', 'Other', 1800),
    ]);

    expect(evaluatePurchase(freedom, { amount: 180, category: 'shopping' }).message).toContain('fits within your guilt-free spending');
    expect(evaluatePurchase(watch, { amount: 50, category: 'dining' }).message).toContain('This is possible');
    expect(evaluatePurchase(recovery, { amount: 60, category: 'shopping' }).message).toContain('increase your recovery gap');
  });

  it('includes mode and safe summary in AI context', () => {
    const context = buildAiFinancialContext([
      tx('Salary', 'Income', 5000, 'INCOME'),
      tx('Rent', 'Housing', 600),
      tx('Dining', 'Dining', 3600),
    ]);

    expect(context).toContain('Mode: Watch Mode');
    expect(context).toContain('Protected money:');
    expect(context).toContain('Guilt-free spending:');
    expect(context).not.toContain('@');
  });

  it('shows setup needed instead of Watch Mode when protected money is missing', () => {
    const insights = buildMonthlyInsights([
      tx('Salary', 'Income', 2588, 'INCOME'),
    ]);

    expect(insights.moneyMode).toMatchObject({
      name: 'Setup Needed',
      protectedMoney: 0,
      protectedMoneyMissing: true,
    });
    expect(insights.categoryWarning).toContain('Add rent, bills');
  });

  it('does not expose bad everything categories in insights', () => {
    const insights = buildMonthlyInsights([
      tx('Salary', 'Income', 1500, 'INCOME'),
      tx('everything', 'everything', 200),
    ]);

    expect(insights.topSpendingCategory.category).not.toBe('everything');
    expect(insights.categoryWarning).toContain('review');
  });

  it('uses demo bank balance snapshots and marks recent demo sync as high confidence', () => {
    const insights = buildMonthlyInsights([
      balance(900),
      { ...tx('Salary', 'Income', 1400, 'INCOME'), source: 'demo_bank' },
      { ...tx('Rent', 'Housing', 300), source: 'demo_bank' },
      { ...tx('Woolworths', 'Groceries', 82.4), source: 'demo_bank' },
      { ...tx('Petrol', 'Transport', 65.2), source: 'demo_bank' },
      { ...tx('Phone bill', 'Bills', 45), source: 'demo_bank' },
      { ...tx('Netflix', 'Subscriptions', 22.99), source: 'demo_bank' },
      { ...tx('Cafe', 'Dining', 18.5), source: 'demo_bank' },
      { ...tx('Loan repayment', 'Debt', 180), source: 'demo_bank' },
    ]);

    expect(insights.moneyMode.currentBalance).toBe(900);
    expect(insights.moneyMode.protectedMoney).toBeCloseTo(672.6, 1);
    expect(insights.moneyMode.guiltFreeSpending).toBeCloseTo(227.4, 1);
    expect(insights.moneyMode.name).toBe('Freedom Mode');
    expect(insights.confidence.level).toBe('High');
    expect(insights.demoBank.connected).toBe(true);
    expect(insights.demoBank.label).toBe('Demo Bank Connected');
  });
});

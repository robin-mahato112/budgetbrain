import { describe, expect, it } from 'vitest';
import { CsvProvider } from '../services/financialSources/CsvProvider.js';
import { normalizeTransaction } from '../services/transactionNormalizationService.js';
import { detectRecurringTransactions } from '../services/recurrenceService.js';
import { calculateConfidence, calculateSafeToSpend } from '../services/safeToSpendService.js';
import { forecastPayday } from '../services/holidayService.js';

describe('safe-to-spend service', () => {
  it('handles positive, zero, negative, and no-protected-cost cases', () => {
    expect(calculateSafeToSpend({ currentBalance: 1000, obligations: [{ description: 'Rent', amount: 600, kind: 'FIXED' }] }).safeToSpend).toBe(400);
    expect(calculateSafeToSpend({ currentBalance: 600, obligations: [{ description: 'Rent', amount: 600, kind: 'FIXED' }] }).safeToSpend).toBe(0);
    expect(calculateSafeToSpend({ currentBalance: 500, obligations: [{ description: 'Rent', amount: 600, kind: 'FIXED' }] })).toMatchObject({ safeToSpend: 0, recoveryGap: 100, mode: 'RECOVERY' });
    expect(calculateSafeToSpend({ currentBalance: 500, obligations: [] }).safeToSpend).toBe(500);
  });

  it('uses converted values and does not count a linked obligation twice', () => {
    const result = calculateSafeToSpend({
      currentBalance: 1000,
      obligations: [
        { description: 'Family support', amount: 50000, convertedAmount: 552.14, kind: 'ESSENTIAL', linkedTransactionId: 'one', confirmed: true },
        { description: 'Family support detected', amount: 552.14, kind: 'FIXED', linkedTransactionId: 'one' },
      ],
    });
    expect(result.protectedMoney).toBe(552.14);
    expect(result.safeToSpend).toBeCloseTo(447.86);
  });

  it('derives confidence from data completeness rather than AI', () => {
    expect(calculateConfidence({ transactionsCurrent: true, paydayConfirmed: true, confirmedEssentials: 4, unconfirmedObligations: 0, uncategorisedTransactions: 0 }).level).toBe('HIGH');
    expect(calculateConfidence({ transactionsCurrent: false, paydayConfirmed: false, confirmedEssentials: 0, unconfirmedObligations: 4, uncategorisedTransactions: 8 }).level).toBe('LOW');
  });
});

describe('transaction normalization', () => {
  const csv = new CsvProvider();
  it('normalizes YNAB expenses and income', () => {
    expect(normalizeTransaction({ source: 'YNAB', externalId: '1', description: 'Woolworths', amount: -82400 / 1000, transactionDate: '2026-08-01', direction: 'EXPENSE' })).toMatchObject({ direction: 'EXPENSE', amount: 82.4, category: 'GROCERIES' });
    expect(normalizeTransaction({ source: 'YNAB', externalId: '2', description: 'Salary', amount: 1400, transactionDate: '2026-08-02', direction: 'INCOME' })).toMatchObject({ direction: 'INCOME', category: 'INCOME' });
  });
  it('normalizes CSV debit and credit columns', () => {
    const mapping = { date: 'Date', description: 'Narrative', debit: 'Debit', credit: 'Credit' };
    expect(csv.normalize({ Date: '25/08/2026', Narrative: 'Coles', Debit: '45.20', Credit: '' }, mapping)).toMatchObject({ direction: 'EXPENSE', amount: 45.2 });
    expect(csv.normalize({ Date: '25/08/2026', Narrative: 'Salary', Debit: '', Credit: '1200' }, mapping)).toMatchObject({ direction: 'INCOME', amount: 1200 });
  });
  it('creates stable duplicate fingerprints and rejects bad values', () => {
    const input = { source: 'CSV', description: 'Rent', amount: -600, transactionDate: '2026-08-01' };
    expect(normalizeTransaction(input).fingerprint).toBe(normalizeTransaction(input).fingerprint);
    expect(() => normalizeTransaction({ ...input, transactionDate: 'bad-date' })).toThrow(/date/i);
    expect(() => normalizeTransaction({ ...input, amount: 'bad' })).toThrow(/amount/i);
  });
});

describe('recurrence detection', () => {
  const expense = (merchant, amount, date) => ({ merchant, amount, occurredAt: new Date(`${date}T00:00:00Z`), type: 'EXPENSE' });
  it('detects weekly rent, monthly subscriptions, and similar merchant names', () => {
    const patterns = detectRecurringTransactions([
      expense('Harbour Realty Pty Ltd', 600, '2026-07-01'), expense('Harbour Realty', 602, '2026-07-08'), expense('Harbour Realty AU', 600, '2026-07-15'),
      expense('Netflix', 18.99, '2026-05-30'), expense('Netflix.com', 18.99, '2026-06-30'), expense('Netflix', 18.99, '2026-07-30'),
    ]);
    expect(patterns.map((item) => item.cadence)).toEqual(expect.arrayContaining(['WEEKLY', 'MONTHLY']));
  });
  it('ignores irregular spending', () => {
    expect(detectRecurringTransactions([expense('Shop', 10, '2026-01-01'), expense('Shop', 80, '2026-01-17'), expense('Shop', 22, '2026-03-22')])).toEqual([]);
  });
});

describe('payday forecasting', () => {
  const holidays = [{ name: 'Christmas Day', holidayDate: new Date('2026-12-25T00:00:00Z') }];
  it('leaves normal payday unchanged and asks before adjusting a holiday', () => {
    expect(forecastPayday('2026-12-24', holidays).requiresConfirmation).toBe(false);
    expect(forecastPayday('2026-12-25', holidays)).toMatchObject({ holiday: 'Christmas Day', requiresConfirmation: true });
  });
  it('applies an explicitly confirmed adjustment', () => {
    expect(forecastPayday('2026-12-25', holidays, 'PREVIOUS_BUSINESS_DAY').forecastDate.toISOString().slice(0, 10)).toBe('2026-12-24');
  });
});

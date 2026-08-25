import { FinancialSourceProvider } from './FinancialSourceProvider.js';
import { normalizeTransaction } from '../transactionNormalizationService.js';

export class CsvProvider extends FinancialSourceProvider {
  constructor() { super('CSV'); }
  normalize(row, mapping, options = {}) {
    const amount = amountFor(row, mapping);
    return normalizeTransaction({
      source: 'CSV',
      transactionDate: row[mapping.date],
      description: row[mapping.description],
      merchant: mapping.merchant ? row[mapping.merchant] : row[mapping.description],
      amount,
      direction: directionFor(row, mapping, amount),
      category: mapping.category ? row[mapping.category] : undefined,
      currency: mapping.currency ? row[mapping.currency] : options.defaultCurrency,
      accountName: mapping.accountName ? row[mapping.accountName] : options.accountName,
    }, options);
  }
}

function amountFor(row, mapping) {
  if (mapping.amount) return parseMoney(row[mapping.amount]);
  const debit = mapping.debit ? parseMoney(row[mapping.debit]) : 0;
  const credit = mapping.credit ? parseMoney(row[mapping.credit]) : 0;
  return credit ? Math.abs(credit) : -Math.abs(debit);
}

function directionFor(row, mapping, amount) {
  if (mapping.type) return row[mapping.type];
  if (mapping.credit && parseMoney(row[mapping.credit])) return 'INCOME';
  if (mapping.debit && parseMoney(row[mapping.debit])) return 'EXPENSE';
  return amount < 0 ? 'EXPENSE' : 'INCOME';
}

function parseMoney(value) {
  const normalized = String(value ?? '').replace(/[$£€¥,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  return Number(normalized);
}

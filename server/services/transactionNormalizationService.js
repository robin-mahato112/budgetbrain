import crypto from 'crypto';
import { AppError } from '../lib/errors.js';
import { categorizeDeterministically, categoryLabel } from './categorisationService.js';

const SOURCES = new Set(['DEMO_BANK', 'YNAB', 'CSV']);

export function normalizeTransaction(input, options = {}) {
  const source = String(input.source || '').toUpperCase();
  if (!SOURCES.has(source)) throw new AppError(400, 'INVALID_TRANSACTION_SOURCE', 'Unsupported financial source');

  const description = sanitize(input.description || input.merchant);
  const merchant = sanitize(input.merchant || description);
  const date = parseTransactionDate(input.transactionDate || input.occurredAt || input.date);
  const amountInput = Number(input.amount);
  if (!description) throw new AppError(400, 'INVALID_TRANSACTION_DESCRIPTION', 'Transaction description is required');
  if (!date) throw new AppError(400, 'INVALID_TRANSACTION_DATE', 'Transaction date is invalid');
  if (!Number.isFinite(amountInput) || amountInput === 0) throw new AppError(400, 'INVALID_TRANSACTION_AMOUNT', 'Transaction amount is invalid');

  const direction = normalizeDirection(input.direction || input.type, amountInput, options.positiveExpenses);
  const amount = Math.abs(amountInput);
  const currency = normalizeCurrency(input.currency || options.defaultCurrency || 'AUD');
  const categorisation = input.category
    ? { category: normalizeCategory(input.category), confidence: 1, reason: 'provider', needsReview: false }
    : categorizeDeterministically(`${merchant} ${description}`, direction, options.userRules);
  const externalId = input.externalId ? String(input.externalId).slice(0, 191) : null;
  const fingerprint = transactionFingerprint({ date, amount, direction, description, accountName: input.accountName });

  return {
    externalId,
    source,
    accountName: input.accountName ? sanitize(input.accountName).slice(0, 120) : null,
    description: description.slice(0, 500),
    merchant: merchant.slice(0, 120),
    amount,
    currency,
    transactionDate: date,
    category: categorisation.category,
    categoryLabel: categoryLabel(categorisation.category),
    categoryConfidence: categorisation.confidence,
    needsReview: categorisation.needsReview,
    direction,
    deleted: Boolean(input.deleted),
    fingerprint,
  };
}

export function toPrismaTransaction(userId, transaction, extra = {}) {
  return {
    userId,
    merchant: transaction.merchant,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.direction,
    category: transaction.categoryLabel,
    occurredAt: transaction.transactionDate,
    source: transaction.source.toLowerCase(),
    externalId: transaction.externalId,
    accountName: transaction.accountName,
    currency: transaction.currency,
    originalAmount: transaction.amount,
    originalCurrency: transaction.currency,
    fingerprint: transaction.fingerprint,
    deletedAt: transaction.deleted ? new Date() : null,
    ...extra,
  };
}

export function transactionFingerprint({ date, amount, direction, description, accountName = '' }) {
  const day = new Date(date).toISOString().slice(0, 10);
  const stable = [day, Number(amount).toFixed(2), String(direction).toUpperCase(), sanitize(description).toLowerCase(), sanitize(accountName).toLowerCase()].join('|');
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function normalizeDirection(value, amount, positiveExpenses = false) {
  const direction = String(value || '').toUpperCase();
  if (['INCOME', 'CREDIT'].includes(direction)) return 'INCOME';
  if (['EXPENSE', 'DEBIT'].includes(direction)) return 'EXPENSE';
  if (positiveExpenses) return amount >= 0 ? 'EXPENSE' : 'INCOME';
  return amount < 0 ? 'EXPENSE' : 'INCOME';
}

function parseTransactionDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value || '').trim();
  const au = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parsed = au
    ? new Date(Date.UTC(Number(au[3]), Number(au[2]) - 1, Number(au[1])))
    : new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new AppError(400, 'INVALID_CURRENCY', 'Currency must be a three-letter ISO code');
  return currency;
}

function normalizeCategory(value) {
  const candidate = String(value || '').trim().toUpperCase().replace(/[ /-]+/g, '_');
  const aliases = { BILLS: 'UTILITIES', DINING: 'DISCRETIONARY', OTHER: 'UNKNOWN', UNCATEGORISED: 'UNKNOWN', SAVING: 'DISCRETIONARY' };
  return aliases[candidate] || candidate;
}

function sanitize(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

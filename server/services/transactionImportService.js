import { AppError } from '../lib/errors.js';

const REQUIRED_COLUMNS = ['date', 'description', 'amount', 'type'];
const MAX_ROWS = 500;

const categoryRules = [
  ['Housing', ['rent', 'room', 'housing', 'mortgage']],
  ['Groceries', ['woolworths', 'coles', 'aldi', 'grocery', 'groceries']],
  ['Subscriptions', ['netflix', 'spotify', 'disney']],
  ['Transport', ['uber', 'opal', 'fuel', 'petrol', 'transport']],
  ['Bills', ['phone', 'internet', 'telstra', 'optus']],
  ['Income', ['salary', 'wage', 'pay', 'kitchen', 'chef']],
  ['Dining', ['restaurant', 'cafe', 'mcdonalds', 'kfc', 'lunch', 'dinner']],
  ['Insurance', ['insurance']],
  ['Debt', ['loan', 'emi', 'emis', 'repayment', 'credit card']],
];

export function categorizeTransaction(description, type = '') {
  const normalized = String(description || '').toLowerCase();
  if (/\beverything\b|unclear|unknown/.test(normalized)) return 'Uncategorised';
  const matched = categoryRules.filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)));
  if (matched.length > 1 && type !== 'income') return 'Mixed / Needs Review';
  if (matched.length === 1) return matched[0][0];
  if (type === 'income') return 'Income';
  return 'Other';
}

export function cleanCategory(category, description = '', type = '') {
  const raw = String(category || '').trim();
  if (!raw || /^everything$/i.test(raw) || /^unknown$/i.test(raw)) {
    return type === 'income' ? 'Income' : 'Uncategorised';
  }
  if (/mixed|needs review/i.test(raw)) return 'Mixed / Needs Review';
  const normalized = raw.toLowerCase();
  if (normalized === 'other') return 'Other';
  for (const [category, keywords] of categoryRules) {
    if (category.toLowerCase() === normalized || keywords.some((keyword) => normalized.includes(keyword))) return category;
  }
  return categorizeTransaction(description || raw, type);
}

export function isUnclearDescription(value) {
  const description = String(value || '').trim();
  return description.length < 2 || /^[a-z]$/i.test(description);
}

export function parseTransactionCsv(csvText, userId) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new AppError(400, 'CSV_EMPTY', 'CSV file is empty');
  }

  const rows = parseCsvRows(csvText);
  if (rows.length < 2) throw new AppError(400, 'CSV_EMPTY', 'CSV must include a header row and at least one transaction');

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new AppError(400, 'CSV_MISSING_COLUMNS', `CSV is missing required columns: ${missing.join(', ')}`);

  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim()));
  if (!dataRows.length) throw new AppError(400, 'CSV_EMPTY', 'CSV contains no transaction rows');
  if (dataRows.length > MAX_ROWS) throw new AppError(400, 'CSV_TOO_LARGE', `Import up to ${MAX_ROWS} transactions at a time`);

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const dateText = cell(row, indexes.date);
    const description = cell(row, indexes.description);
    const amountValue = Number(cell(row, indexes.amount));
    const rawType = cell(row, indexes.type).toLowerCase();
    const type = normalizeType(rawType, amountValue);
    const occurredAt = parseDate(dateText);

    if (!occurredAt) throw new AppError(400, 'CSV_INVALID_DATE', `Row ${rowNumber} has an invalid date`);
    if (!description) throw new AppError(400, 'CSV_INVALID_DESCRIPTION', `Row ${rowNumber} is missing a description`);
    if (isUnclearDescription(description)) {
      throw new AppError(400, 'CSV_INVALID_DESCRIPTION', `Row ${rowNumber} needs a clearer description, like Lunch, Rent, or Salary`);
    }
    if (!Number.isFinite(amountValue) || amountValue === 0) throw new AppError(400, 'CSV_INVALID_AMOUNT', `Row ${rowNumber} has an invalid amount`);
    if (!type) throw new AppError(400, 'CSV_INVALID_TYPE', `Row ${rowNumber} must use income, expense, or saving`);

    return {
      userId,
      merchant: description.slice(0, 120),
      description,
      amount: Math.abs(amountValue),
      type: type.toUpperCase(),
      category: categorizeTransaction(description, type),
      occurredAt,
      source: 'csv',
    };
  });
}

function cell(row, index) {
  return String(row[index] ?? '').trim();
}

function normalizeType(rawType, amount) {
  if (['income', 'expense', 'saving'].includes(rawType)) return rawType;
  if (rawType === 'credit') return 'income';
  if (rawType === 'debit') return 'expense';
  if (!rawType && Number.isFinite(amount)) return amount < 0 ? 'expense' : 'income';
  return null;
}

function parseDate(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows.filter((item) => item.some((value) => String(value).trim()));
}

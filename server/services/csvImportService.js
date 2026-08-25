import crypto from 'crypto';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { CsvProvider } from './financialSources/CsvProvider.js';
import { toPrismaTransaction } from './transactionNormalizationService.js';

const MAX_ROWS = 1000;
const provider = new CsvProvider();

const headerAliases = {
  date: ['date', 'transaction date', 'posted date', 'processed date'],
  description: ['description', 'narrative', 'details', 'transaction details', 'memo', 'payee'],
  merchant: ['merchant', 'payee'],
  amount: ['amount', 'transaction amount'],
  debit: ['debit', 'withdrawal', 'money out'],
  credit: ['credit', 'deposit', 'money in'],
  type: ['type', 'direction', 'transaction type'],
  category: ['category'],
  currency: ['currency', 'currency code'],
  accountName: ['account', 'account name'],
};

export function inspectCsv(csvText, requestedMapping = {}) {
  if (typeof csvText !== 'string' || !csvText.trim()) throw new AppError(400, 'CSV_EMPTY', 'CSV file is empty');
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) throw new AppError(400, 'CSV_EMPTY', 'CSV must include headers and at least one transaction');
  const headers = rows[0].map((header) => String(header).trim());
  const mapping = { ...detectMapping(headers), ...requestedMapping };
  if (!mapping.date || !mapping.description || (!mapping.amount && !(mapping.debit || mapping.credit))) {
    return { headers, mapping, needsMapping: true, rows: rows.slice(1), normalized: [], invalid: [] };
  }
  const dataRows = rows.slice(1).filter((row) => row.some((value) => String(value).trim()));
  if (dataRows.length > MAX_ROWS) throw new AppError(400, 'CSV_TOO_LARGE', `Import up to ${MAX_ROWS} rows at a time`);
  const objects = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
  const normalized = [];
  const invalid = [];
  objects.forEach((row, index) => {
    try {
      normalized.push({ rowNumber: index + 2, raw: row, transaction: provider.normalize(row, mapping) });
    } catch (error) {
      invalid.push({ rowNumber: index + 2, raw: row, error: error.message });
    }
  });
  return { headers, mapping, needsMapping: false, rows: objects, normalized, invalid };
}

export async function createCsvPreview(userId, { csvText, fileName = 'transactions.csv', mapping = {} }) {
  const inspected = inspectCsv(csvText, mapping);
  if (inspected.needsMapping) return previewResponse(inspected, { fileName, duplicates: [] });
  const fingerprints = inspected.normalized.map((item) => item.transaction.fingerprint);
  const existing = fingerprints.length ? await prisma.transaction.findMany({
    where: { userId, fingerprint: { in: fingerprints }, deletedAt: null }, select: { fingerprint: true },
  }) : [];
  const duplicateSet = new Set(existing.map((item) => item.fingerprint));
  const seen = new Set();
  const duplicateRows = [];
  const validRows = [];
  for (const item of inspected.normalized) {
    if (duplicateSet.has(item.transaction.fingerprint) || seen.has(item.transaction.fingerprint)) duplicateRows.push(item);
    else { seen.add(item.transaction.fingerprint); validRows.push(item); }
  }
  const fileFingerprint = crypto.createHash('sha256').update(csvText).digest('hex');
  const transactionImport = await prisma.transactionImport.upsert({
    where: { userId_fingerprint: { userId, fingerprint: fileFingerprint } },
    update: {
      fileName: fileName.slice(0, 255), status: 'PREVIEW', totalRows: inspected.rows.length,
      validRows: validRows.length, duplicateRows: duplicateRows.length, invalidRows: inspected.invalid.length, mapping: inspected.mapping,
      rows: { deleteMany: {}, create: buildRows(validRows, duplicateRows, inspected.invalid) },
    },
    create: {
      userId, fileName: fileName.slice(0, 255), fingerprint: fileFingerprint, totalRows: inspected.rows.length,
      validRows: validRows.length, duplicateRows: duplicateRows.length, invalidRows: inspected.invalid.length, mapping: inspected.mapping,
      rows: { create: buildRows(validRows, duplicateRows, inspected.invalid) },
    },
    include: { rows: { orderBy: { rowNumber: 'asc' } } },
  });
  return previewResponse(inspected, { id: transactionImport.id, fileName, validRows, duplicates: duplicateRows });
}

export async function confirmCsvImport(userId, importId) {
  const transactionImport = await prisma.transactionImport.findFirst({
    where: { id: importId, userId, status: 'PREVIEW' }, include: { rows: { orderBy: { rowNumber: 'asc' } } },
  });
  if (!transactionImport) throw new AppError(404, 'CSV_IMPORT_NOT_FOUND', 'CSV import preview not found');
  const validRows = transactionImport.rows.filter((row) => row.status === 'VALID');
  const transactions = validRows.map((row) => {
    const normalized = provider.normalize(row.rawData, transactionImport.mapping);
    return toPrismaTransaction(userId, normalized, { importId: transactionImport.id });
  });
  let created = { count: 0 };
  if (transactions.length) created = await prisma.transaction.createMany({ data: transactions, skipDuplicates: true });
  await prisma.transactionImport.update({
    where: { id: transactionImport.id },
    data: { status: created.count === transactions.length ? 'COMPLETED' : 'PARTIAL', completedAt: new Date() },
  });
  return { importId, imported: created.count, duplicates: transactionImport.duplicateRows, invalid: transactionImport.invalidRows };
}

export async function listCsvImports(userId) {
  return prisma.transactionImport.findMany({ where: { userId, status: { not: 'DELETED' } }, orderBy: { createdAt: 'desc' } });
}

export async function deleteCsvImport(userId, importId, deleteTransactions = false) {
  const found = await prisma.transactionImport.findFirst({ where: { id: importId, userId } });
  if (!found) throw new AppError(404, 'CSV_IMPORT_NOT_FOUND', 'CSV import not found');
  const removed = deleteTransactions ? await prisma.transaction.deleteMany({ where: { userId, importId } }) : { count: 0 };
  await prisma.transactionImport.update({ where: { id: importId }, data: { status: 'DELETED' } });
  return { deleted: true, removedTransactions: removed.count };
}

function detectMapping(headers) {
  const normalized = new Map(headers.map((header) => [header.toLowerCase().replace(/[_-]+/g, ' ').trim(), header]));
  const mapping = {};
  for (const [field, aliases] of Object.entries(headerAliases)) {
    const match = aliases.find((alias) => normalized.has(alias));
    if (match) mapping[field] = normalized.get(match);
  }
  return mapping;
}

function buildRows(valid, duplicates, invalid) {
  return [
    ...valid.map((item) => rowData(item, 'VALID')),
    ...duplicates.map((item) => rowData(item, 'DUPLICATE')),
    ...invalid.map((item) => ({ rowNumber: item.rowNumber, rawData: item.raw, status: 'INVALID', error: item.error })),
  ];
}

function rowData(item, status) {
  return { rowNumber: item.rowNumber, rawData: item.raw, status, fingerprint: item.transaction.fingerprint };
}

function previewResponse(inspected, options) {
  const valid = options.validRows || inspected.normalized;
  return {
    id: options.id || null,
    fileName: options.fileName,
    headers: inspected.headers,
    suggestedMapping: inspected.mapping,
    needsMapping: inspected.needsMapping,
    counts: { total: inspected.rows.length, valid: valid.length, duplicates: options.duplicates.length, invalid: inspected.invalid.length },
    sample: valid.slice(0, 8).map((item) => ({ rowNumber: item.rowNumber, ...item.transaction })),
    duplicates: options.duplicates.slice(0, 8).map((item) => ({ rowNumber: item.rowNumber, ...item.transaction })),
    invalid: inspected.invalid.slice(0, 20),
  };
}

function parseCsvRows(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]; const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  row.push(field); rows.push(row);
  return rows.filter((item) => item.some((value) => String(value).trim()));
}

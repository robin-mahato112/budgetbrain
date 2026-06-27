import { AppError } from '../lib/errors.js';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { geminiStatus } from './geminiService.js';
import { categorizeTransaction } from './transactionImportService.js';

const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const allowedTypes = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain', 'text/csv']);
const pendingDocuments = new Map();

export function uploadAndExtract({ userId, fileName, mimeType, size, kind, contentText = '' }) {
  if (!env.UPLOADS_ENABLED) {
    throw new AppError(503, 'UPLOADS_DISABLED', 'Uploads are currently disabled.');
  }
  if (!allowedTypes.has(mimeType)) {
    throw new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Upload a PNG, JPG, JPEG, PDF, CSV, or plain text file');
  }
  if (size > maxBytes) {
    throw new AppError(413, 'FILE_TOO_LARGE', 'Uploads must be 5MB or smaller');
  }

  const documentKind = normalizeKind(kind || inferKind(fileName, contentText));
  const ocr = geminiStatus();
  const extractedData = extractData(documentKind, `${fileName || ''}\n${contentText || ''}`);
  const document = {
    id: randomUUID(),
    userId,
    fileName: String(fileName || 'uploaded-document').slice(0, 160),
    mimeType,
    size,
    kind: documentKind,
    status: 'NEEDS_CONFIRMATION',
    extractionStatus: ocr.configured ? 'AI_DETECTED' : 'MANUAL_FALLBACK',
    extractionMessage: ocr.message,
    extractedData: { ...extractedData, aiDetected: ocr.configured },
    createdAt: new Date().toISOString(),
  };
  pendingDocuments.set(document.id, document);
  return publicDocument(document);
}

export function parseQuickAddText(userId, text) {
  const source = String(text || '').trim();
  if (!source) throw new AppError(400, 'EMPTY_QUICK_ADD', 'Enter a sentence to scan');
  const incomeMatch = source.match(/(?:got paid|paid|received|earned)\s+\$?\s*(\d+(?:\.\d{1,2})?)\s+(?:from|at|for)?\s*([a-z][a-z\s]{1,60})/i);
  if (incomeMatch) {
    const sourceName = incomeMatch[2].replace(/\btoday\b|\byesterday\b|\btomorrow\b|\.$/gi, '').trim();
    return storeQuickAdd(userId, source, [{
      merchant: titleCase(sourceName),
      amount: Number(incomeMatch[1]),
      category: 'Income',
      type: 'income',
      occurredAt: new Date().toISOString().slice(0, 10),
      description: titleCase(sourceName),
      aiDetected: true,
    }]);
  }
  const matches = source.split(/\s+and\s+|,/i)
    .map((part) => part.match(/\$?\s*(\d+(?:\.\d{1,2})?)\s+(?:on|for)?\s*([a-z][a-z\s]{1,40})/i))
    .filter(Boolean);
  const items = matches.length ? matches.map((match) => {
    const description = match[2].replace(/\btoday\b|\byesterday\b|\btomorrow\b|\.$/gi, '').trim();
    return ({
    merchant: titleCase(description),
    amount: Number(match[1]),
    category: categorizeTransaction(description, 'expense'),
    type: 'expense',
    occurredAt: new Date().toISOString().slice(0, 10),
    description: titleCase(description),
    aiDetected: true,
  });
  }) : [{
    merchant: 'Detected expense',
    amount: extractAmount(source) || 0,
    category: categorizeTransaction(source, 'expense'),
    type: 'expense',
    occurredAt: new Date().toISOString().slice(0, 10),
    description: source.slice(0, 160),
    aiDetected: true,
  }];

  return storeQuickAdd(userId, source, items);
}

function storeQuickAdd(userId, source, items) {
  const document = {
    id: randomUUID(),
    userId,
    fileName: 'quick-add.txt',
    mimeType: 'text/plain',
    size: source.length,
    kind: 'quick_add',
    status: 'NEEDS_CONFIRMATION',
    extractedData: { items },
    createdAt: new Date().toISOString(),
  };
  pendingDocuments.set(document.id, document);
  return publicDocument(document);
}

export function getPendingDocument(userId, id) {
  const document = pendingDocuments.get(id);
  if (!document || document.userId !== userId) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Uploaded document not found');
  return document;
}

export function deletePendingDocument(userId, id) {
  getPendingDocument(userId, id);
  pendingDocuments.delete(id);
}

export function listPendingDocuments(userId) {
  return [...pendingDocuments.values()].filter((document) => document.userId === userId).map(publicDocument);
}

export function publicDocument(document) {
  const { userId, ...safe } = document;
  return safe;
}

function normalizeKind(kind) {
  return ['receipt', 'payslip', 'bill', 'screenshot', 'invoice', 'quick_add'].includes(kind) ? kind : 'receipt';
}

function inferKind(fileName, text) {
  const value = `${fileName || ''} ${text || ''}`.toLowerCase();
  if (/pay\s*slip|payslip|gross|net pay|tax withheld/.test(value)) return 'payslip';
  if (/bill|due|invoice|provider/.test(value)) return 'bill';
  return 'receipt';
}

function extractData(kind, source) {
  if (kind === 'payslip') {
    const netPay = extractLabeledAmount(source, ['net pay', 'net']) || extractAmount(source) || 0;
    const grossPay = extractLabeledAmount(source, ['gross pay', 'gross']) || netPay;
    const taxWithheld = extractLabeledAmount(source, ['tax withheld', 'tax']) || 0;
    return {
      aiDetected: true,
      employer: extractName(source) || 'Detected employer',
      payDate: extractDate(source),
      payPeriod: '',
      grossPay,
      taxWithheld,
      netPay,
      hoursWorked: null,
      hourlyRate: null,
      superannuation: null,
      type: 'income',
      category: 'Income',
      description: 'AI detected payslip income',
    };
  }
  if (kind === 'bill' || kind === 'invoice') {
    return {
      aiDetected: true,
      provider: extractName(source) || 'Detected provider',
      dueDate: extractDate(source),
      amountDue: extractAmount(source) || 0,
      category: categorizeTransaction(source, 'expense'),
      recurring: /monthly|weekly|recurring/i.test(source),
      paymentStatus: /paid/i.test(source) ? 'paid' : 'due',
      type: 'expense',
      description: 'AI detected bill',
    };
  }
  return {
    aiDetected: true,
    merchant: extractName(source) || 'Detected merchant',
    occurredAt: extractDate(source),
    amount: extractAmount(source) || 0,
    category: categorizeTransaction(source, 'expense'),
    description: 'AI detected expense',
    paymentType: /visa|mastercard|card/i.test(source) ? 'Card' : '',
    type: 'expense',
  };
}

function extractAmount(text) {
  const match = String(text).match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function extractLabeledAmount(text, labels) {
  for (const label of labels) {
    const match = String(text).match(new RegExp(`${label}\\s*:?\\s*\\$?\\s*(\\d+(?:\\.\\d{1,2})?)`, 'i'));
    if (match) return Number(match[1]);
  }
  return null;
}

function extractDate(text) {
  const iso = String(text).match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  return new Date().toISOString().slice(0, 10);
}

function extractName(text) {
  const words = String(text).split(/\r?\n|,|\s{2,}/).map((item) => item.trim()).filter(Boolean);
  const useful = words.find((line) => /[a-z]/i.test(line) && !/\d{4}-\d{2}-\d{2}|\$?\d/.test(line));
  return useful ? titleCase(useful.slice(0, 80)) : '';
}

function titleCase(value) {
  return String(value).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

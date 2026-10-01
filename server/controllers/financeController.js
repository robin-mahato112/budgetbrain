import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { buildMonthlyInsights, monthBounds } from '../services/financialContextService.js';
import { getFinancialState } from '../services/financialStateService.js';
import { assessPurchase } from '../services/purchaseAssessmentService.js';
import {
  deletePendingDocument,
  getPendingDocument,
  listPendingDocuments,
  parseQuickAddText,
  publicDocument,
  uploadAndExtract,
} from '../services/documentExtractionService.js';
import { cleanCategory, isUnclearDescription, parseTransactionCsv } from '../services/transactionImportService.js';
import { confirmCsvImport, createCsvPreview, deleteCsvImport, listCsvImports } from '../services/csvImportService.js';
import { TRANSACTION_CATEGORIES, categoryLabel, merchantKey } from '../services/categorisationService.js';
import { detectRecurringTransactions } from '../services/recurrenceService.js';
import { convertCurrency } from '../services/currencyService.js';
import { forecastPayday, holidaysFor } from '../services/holidayService.js';

const number = (value) => Number(value);
const monthStart = (value = new Date()) => monthBounds(value).start;
const nextMonth = (value = new Date()) => monthBounds(value).end;
const signedAmount = (transaction) => transaction.type === 'INCOME' ? number(transaction.amount) : -number(transaction.amount);

export async function getFinanceSummary(req, res) {
  const start = monthStart();
  const end = nextMonth();
  const [transactions, goals, debts] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: req.user.id, occurredAt: { gte: start, lt: end } } }),
    prisma.savingsGoal.findMany({ where: { userId: req.user.id } }),
    prisma.debt.findMany({ where: { userId: req.user.id } }),
  ]);
  res.json({
    income: transactions.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + number(item.amount), 0),
    expenses: transactions.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + number(item.amount), 0),
    savings: goals.reduce((sum, goal) => sum + number(goal.current), 0),
    debt: debts.reduce((sum, debt) => sum + number(debt.balance), 0),
  });
}

export async function getSpendingTrend(req, res) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user.id, type: 'EXPENSE', occurredAt: { gte: start } },
  });
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    return {
      key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
      month: date.toLocaleString('en-AU', { month: 'short', timeZone: 'UTC' }),
      amount: 0,
    };
  });
  for (const transaction of transactions) {
    const key = `${transaction.occurredAt.getUTCFullYear()}-${transaction.occurredAt.getUTCMonth()}`;
    const month = months.find((item) => item.key === key);
    if (month) month.amount += number(transaction.amount);
  }
  res.json(months.map(({ key, ...month }) => month));
}

export async function listBudgets(req, res) {
  if (req.query.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month)) {
    throw new AppError(400, 'INVALID_MONTH', 'Month must use YYYY-MM format');
  }
  const month = req.query.month ? monthStart(new Date(`${req.query.month}-01T00:00:00Z`)) : monthStart();
  const [budgets, spending] = await Promise.all([
    prisma.budget.findMany({ where: { userId: req.user.id, month }, orderBy: { category: 'asc' } }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { userId: req.user.id, type: 'EXPENSE', occurredAt: { gte: month, lt: nextMonth(month) } },
      _sum: { amount: true },
    }),
  ]);
  const byCategory = new Map(spending.map((item) => [item.category, number(item._sum.amount || 0)]));
  res.json(budgets.map((budget) => ({
    id: budget.id,
    category: budget.category,
    limit: number(budget.limit),
    spent: byCategory.get(budget.category) || 0,
    month: budget.month,
    color: budget.color,
  })));
}

export async function createBudget(req, res) {
  const budget = await prisma.budget.upsert({
    where: {
      userId_category_month: {
        userId: req.user.id,
        category: req.body.category,
        month: monthStart(new Date(req.body.month)),
      },
    },
    create: { ...req.body, month: monthStart(new Date(req.body.month)), userId: req.user.id },
    update: { limit: req.body.limit, color: req.body.color },
  });
  res.status(201).json({ ...budget, limit: number(budget.limit) });
}

export async function updateBudget(req, res) {
  const exists = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!exists) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Budget not found');
  const budget = await prisma.budget.update({ where: { id: exists.id }, data: req.body });
  res.json({ ...budget, limit: number(budget.limit) });
}

export async function deleteBudget(req, res) {
  const deleted = await prisma.budget.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!deleted.count) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Budget not found');
  res.status(204).end();
}

export async function listTransactions(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));
  const search = String(req.query.search || '').trim();
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user.id,
      source: { not: 'demo_balance' },
      ...(search ? {
        OR: [
          { merchant: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  });
  res.json(transactions.map((item) => {
    const type = item.type.toLowerCase();
    return {
      ...item,
      category: cleanCategory(item.category, item.description || item.merchant, type),
      amount: signedAmount(item),
      type,
    };
  }));
}

export async function createTransaction(req, res) {
  const clearText = req.body.description || req.body.merchant;
  if (isUnclearDescription(clearText)) {
    throw new AppError(400, 'UNCLEAR_TRANSACTION_DESCRIPTION', 'Please enter a clearer description, like Lunch, Rent, or Salary.');
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { baseCurrency: true } });
  const sourceCurrency = req.body.currency || user?.baseCurrency || 'AUD';
  const conversion = await convertCurrency({ amount: Math.abs(req.body.amount), sourceCurrency, targetCurrency: user?.baseCurrency || 'AUD' });
  const { currency: ignoredCurrency, ...body } = req.body;
  const transaction = await prisma.transaction.create({
    data: {
      ...body,
      merchant: String(req.body.merchant || '').trim(),
      description: req.body.description ? String(req.body.description).trim() : null,
      category: cleanCategory(req.body.category, clearText, req.body.type),
      type: req.body.type.toUpperCase(),
      amount: conversion.convertedAmount,
      currency: conversion.targetCurrency,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.sourceCurrency,
      exchangeRate: conversion.exchangeRate,
      rateDate: conversion.rateDate,
      occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
      userId: req.user.id,
      source: 'manual',
    },
  });
  res.status(201).json({ ...transaction, amount: signedAmount(transaction), type: transaction.type.toLowerCase() });
}

export async function getPaydayForecast(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { nextPayday: true, paydayConfirmed: true, holidayPaydayRule: true, countryCode: true, currentBalance: true, expectedIncome: true, incomeFrequency: true, safetyBuffer: true } });
  if (!user?.nextPayday) return res.json({ nextPayday: null, paydayConfirmed: false, requiresConfirmation: false });
  const holidays = await holidaysFor(user.countryCode, user.nextPayday.getUTCFullYear());
  res.json({ ...forecastPayday(user.nextPayday, holidays, user.holidayPaydayRule), paydayConfirmed: user.paydayConfirmed, countryCode: user.countryCode, currentBalance: number(user.currentBalance), expectedIncome: number(user.expectedIncome), incomeFrequency: user.incomeFrequency, safetyBuffer: number(user.safetyBuffer) });
}

export async function savePaydayForecast(req, res) {
  const nextPayday = new Date(req.body.nextPayday);
  const behaviour = req.body?.holidayPaydayRule ? String(req.body.holidayPaydayRule).toUpperCase() : null;
  if (behaviour && !['PREVIOUS_BUSINESS_DAY', 'NEXT_BUSINESS_DAY', 'SAME_DATE', 'MANUAL'].includes(behaviour)) throw new AppError(400, 'INVALID_PAYDAY_RULE', 'Payday holiday preference is invalid');
  const user = await prisma.user.update({ where: { id: req.user.id }, data: {
    nextPayday, paydayConfirmed: req.body.paydayConfirmed, holidayPaydayRule: behaviour,
    currentBalance: req.body.currentBalance, expectedIncome: req.body.expectedIncome,
    incomeFrequency: req.body.incomeFrequency, safetyBuffer: req.body.safetyBuffer,
  } });
  const holidays = await holidaysFor(user.countryCode, nextPayday.getUTCFullYear());
  res.json({ ...forecastPayday(nextPayday, holidays, behaviour), paydayConfirmed: user.paydayConfirmed, countryCode: user.countryCode, currentBalance: number(user.currentBalance), expectedIncome: number(user.expectedIncome), incomeFrequency: user.incomeFrequency, safetyBuffer: number(user.safetyBuffer) });
}

export async function getTransaction(req, res) {
  const transaction = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id, deletedAt: null } });
  if (!transaction) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  res.json({ ...transaction, amount: signedAmount(transaction), type: transaction.type.toLowerCase() });
}

export async function updateTransaction(req, res) {
  const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id, deletedAt: null } });
  if (!existing) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  const type = req.body.type ? req.body.type.toUpperCase() : existing.type;
  const merchant = req.body.merchant === undefined ? existing.merchant : String(req.body.merchant).trim();
  const description = req.body.description === undefined ? existing.description : req.body.description;
  const clearText = description || merchant;
  if (isUnclearDescription(clearText)) throw new AppError(400, 'UNCLEAR_TRANSACTION_DESCRIPTION', 'Please enter a clearer transaction description');
  const data = {
    ...(req.body.merchant !== undefined ? { merchant } : {}),
    ...(req.body.description !== undefined ? { description } : {}),
    ...(req.body.amount !== undefined ? { amount: Math.abs(req.body.amount), originalAmount: Math.abs(req.body.amount) } : {}),
    ...(req.body.type !== undefined ? { type } : {}),
    ...(req.body.occurredAt !== undefined ? { occurredAt: new Date(req.body.occurredAt) } : {}),
    ...(req.body.category !== undefined || req.body.merchant !== undefined || req.body.description !== undefined || req.body.type !== undefined
      ? { category: cleanCategory(req.body.category || existing.category, clearText, type.toLowerCase()) } : {}),
  };
  const transaction = await prisma.transaction.update({ where: { id: existing.id }, data });
  res.json({ ...transaction, amount: signedAmount(transaction), type: transaction.type.toLowerCase() });
}

export async function markTransactionRecurring(req, res) {
  const transaction = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id, type: 'EXPENSE', deletedAt: null } });
  if (!transaction) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Expense transaction not found');
  const cadence = String(req.body?.cadence || 'MONTHLY').toUpperCase();
  if (!['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'].includes(cadence)) throw new AppError(400, 'INVALID_CADENCE', 'Recurring cadence is invalid');
  const nextExpectedAt = new Date(transaction.occurredAt);
  if (cadence === 'WEEKLY') nextExpectedAt.setUTCDate(nextExpectedAt.getUTCDate() + 7);
  if (cadence === 'FORTNIGHTLY') nextExpectedAt.setUTCDate(nextExpectedAt.getUTCDate() + 14);
  if (cadence === 'MONTHLY') nextExpectedAt.setUTCMonth(nextExpectedAt.getUTCMonth() + 1);
  const key = merchantKey(transaction.merchant || transaction.description);
  const pattern = await prisma.recurringTransactionPattern.upsert({
    where: { userId_merchantKey_cadence: { userId: req.user.id, merchantKey: key, cadence } },
    create: { userId: req.user.id, merchantKey: key, description: transaction.merchant, amount: transaction.amount, currency: transaction.currency, cadence, nextExpectedAt, confidence: 1, protectionStatus: 'PENDING' },
    update: { description: transaction.merchant, amount: transaction.amount, nextExpectedAt, protectionStatus: 'PENDING' },
  });
  res.status(201).json({ ...pattern, amount: Number(pattern.amount), confidence: Number(pattern.confidence) });
}

export async function importTransactions(req, res) {
  const transactions = parseTransactionCsv(req.body, req.user.id);
  const created = await prisma.transaction.createMany({ data: transactions });
  res.status(201).json({
    imported: created.count,
    categories: transactions.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}),
  });
}

export async function previewCsvImport(req, res) {
  const mappingHeader = req.headers['x-column-mapping'];
  let mapping = {};
  if (mappingHeader) {
    try { mapping = JSON.parse(String(mappingHeader)); }
    catch { throw new AppError(400, 'CSV_INVALID_MAPPING', 'CSV column mapping must be valid JSON'); }
  }
  const preview = await createCsvPreview(req.user.id, {
    csvText: req.body,
    fileName: String(req.headers['x-file-name'] || 'transactions.csv'),
    mapping,
  });
  res.status(201).json(preview);
}

export async function confirmCsvImportPreview(req, res) {
  res.status(201).json(await confirmCsvImport(req.user.id, req.params.id));
}

export async function getCsvImports(req, res) {
  res.json(await listCsvImports(req.user.id));
}

export async function removeCsvImport(req, res) {
  res.json(await deleteCsvImport(req.user.id, req.params.id, req.query.deleteTransactions === 'true'));
}

export async function getTransactionInsights(req, res) {
  res.json(await loadTransactionInsights(req.user.id));
}

export async function checkAffordability(req, res) {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, 'INVALID_PURCHASE_AMOUNT', 'Purchase amount must be greater than zero');
  }
  const state = await getFinancialState(req.user.id);
  if (!state) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  res.json(assessPurchase(state, amount));
}

export async function uploadDocument(req, res) {
  const mimeType = req.headers['content-type'];
  const size = Number(req.headers['content-length'] || req.body?.length || 0);
  const fileName = req.headers['x-file-name'] || 'uploaded-document';
  const kind = req.headers['x-document-kind'] || req.query.kind;
  const contentText = mimeType === 'text/plain' ? req.body.toString('utf8') : String(fileName);
  const document = uploadAndExtract({
    userId: req.user.id,
    fileName,
    mimeType,
    size,
    kind,
    contentText,
  });
  res.status(201).json(document);
}

export async function quickAddPreview(req, res) {
  res.status(201).json(parseQuickAddText(req.user.id, req.body.text));
}

export async function listDocumentPreviews(req, res) {
  res.json(listPendingDocuments(req.user.id));
}

export async function deleteDocumentPreview(req, res) {
  deletePendingDocument(req.user.id, req.params.id);
  res.status(204).end();
}

export async function confirmExtractedDocument(req, res) {
  const document = getPendingDocument(req.user.id, req.params.id);
  const edited = req.body.editedData || document.extractedData;
  const data = buildTransactionsFromExtracted(req.user.id, document.kind, edited);
  if (!data.length) throw new AppError(400, 'NO_EXTRACTED_DATA', 'No confirmed financial data was provided');
  const created = data.length === 1
    ? { count: 1, items: [await prisma.transaction.create({ data: data[0] })] }
    : { count: (await prisma.transaction.createMany({ data })).count, items: [] };
  deletePendingDocument(req.user.id, document.id);
  res.status(201).json({ saved: created.count, document: publicDocument({ ...document, status: 'CONFIRMED', extractedData: edited }), transactions: created.items });
}

function buildTransactionsFromExtracted(userId, kind, data) {
  if (kind === 'quick_add') {
    return (data.items || []).map((item) => transactionData(userId, {
      merchant: item.merchant || item.description || 'Quick add expense',
      amount: item.amount,
      category: item.category,
      type: 'expense',
      occurredAt: item.occurredAt,
      description: item.description,
    }));
  }
  if (kind === 'payslip') {
    return [transactionData(userId, {
      merchant: data.employer || 'Payslip income',
      amount: data.netPay,
      category: 'Income',
      type: 'income',
      occurredAt: data.payDate,
      description: data.description || `Net pay from ${data.employer || 'payslip'}`,
    })];
  }
  if (kind === 'bill' || kind === 'invoice') {
    return [transactionData(userId, {
      merchant: data.provider || 'Detected bill',
      amount: data.amountDue,
      category: data.category,
      type: 'expense',
      occurredAt: data.dueDate,
      description: data.description || 'Confirmed AI detected bill',
    })];
  }
  return [transactionData(userId, {
    merchant: data.merchant || 'Detected expense',
    amount: data.amount,
    category: data.category,
    type: 'expense',
    occurredAt: data.occurredAt,
    description: data.description || 'Confirmed AI detected expense',
  })];
}

function transactionData(userId, input) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(400, 'INVALID_EXTRACTED_AMOUNT', 'Confirmed amount must be greater than zero');
  const clearText = input.description || input.merchant;
  if (isUnclearDescription(clearText)) {
    throw new AppError(400, 'UNCLEAR_TRANSACTION_DESCRIPTION', 'Please enter a clearer description, like Lunch, Rent, or Salary.');
  }
  return {
    userId,
    merchant: String(input.merchant || 'Confirmed transaction').slice(0, 120),
    category: cleanCategory(input.category, clearText, input.type).slice(0, 80),
    amount: Math.abs(amount),
    type: String(input.type).toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE',
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    description: input.description ? String(input.description).slice(0, 500) : null,
    source: 'ai_document',
  };
}

async function loadTransactionInsights(userId) {
  const { start, end } = monthBounds();
  const previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  const [transactions, previousTransactions, debts, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: previousStart, lt: start } },
    }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.savingsGoal.findMany({ where: { userId } }),
  ]);
  const financialState = await getFinancialState(userId);
  return buildMonthlyInsights(transactions, { previousTransactions, debts, goals, financialState });
}

export async function deleteTransaction(req, res) {
  const deleted = await prisma.transaction.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!deleted.count) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  res.status(204).end();
}

export async function updateTransactionCategory(req, res) {
  const category = String(req.body?.category || '').toUpperCase();
  if (!TRANSACTION_CATEGORIES.includes(category)) throw new AppError(400, 'INVALID_CATEGORY', 'Select a valid BudgetBrain category');
  const transaction = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!transaction) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  const key = merchantKey(transaction.merchant || transaction.description);
  const updated = await prisma.$transaction([
    prisma.transaction.update({ where: { id: transaction.id }, data: { category: categoryLabel(category) } }),
    prisma.userCategoryRule.upsert({
      where: { userId_merchantKey: { userId: req.user.id, merchantKey: key } },
      create: { userId: req.user.id, merchantKey: key, category }, update: { category },
    }),
  ]);
  res.json({ ...updated[0], categoryCode: category, remembered: true });
}

export async function listRecurringPatterns(req, res) {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user.id, type: 'EXPENSE', deletedAt: null }, orderBy: { occurredAt: 'asc' }, take: 1000,
  });
  const detected = detectRecurringTransactions(transactions);
  for (const pattern of detected) {
    await prisma.recurringTransactionPattern.upsert({
      where: { userId_merchantKey_cadence: { userId: req.user.id, merchantKey: pattern.merchantKey, cadence: pattern.cadence } },
      create: { userId: req.user.id, ...pattern, occurrences: undefined },
      update: { description: pattern.description, amount: pattern.amount, currency: pattern.currency, nextExpectedAt: pattern.nextExpectedAt, confidence: pattern.confidence },
    });
  }
  const patterns = await prisma.recurringTransactionPattern.findMany({ where: { userId: req.user.id }, orderBy: { nextExpectedAt: 'asc' } });
  res.json(patterns.map((item) => ({ ...item, amount: Number(item.amount), confidence: Number(item.confidence) })));
}

export async function updateRecurringPattern(req, res) {
  const status = String(req.body?.protectionStatus || '').toUpperCase();
  if (!['PROTECTED', 'IGNORED', 'PENDING'].includes(status)) throw new AppError(400, 'INVALID_PROTECTION_STATUS', 'Protection status is invalid');
  const exists = await prisma.recurringTransactionPattern.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!exists) throw new AppError(404, 'RECURRING_PATTERN_NOT_FOUND', 'Recurring payment was not found');
  const updated = await prisma.recurringTransactionPattern.update({ where: { id: exists.id }, data: { protectionStatus: status } });
  res.json({ ...updated, amount: Number(updated.amount), confidence: Number(updated.confidence) });
}

export async function listSavingsGoals(req, res) {
  const goals = await prisma.savingsGoal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json(goals.map((goal) => ({
    ...goal,
    target: number(goal.target),
    current: number(goal.current),
    monthly: goal.monthly === null ? null : number(goal.monthly),
  })));
}

export async function createSavingsGoal(req, res) {
  const goal = await prisma.savingsGoal.create({
    data: {
      ...req.body,
      deadline: req.body.deadline ? new Date(req.body.deadline) : null,
      userId: req.user.id,
    },
  });
  res.status(201).json({ ...goal, target: number(goal.target), current: number(goal.current), monthly: goal.monthly === null ? null : number(goal.monthly) });
}

export async function updateSavingsGoal(req, res) {
  const exists = await prisma.savingsGoal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!exists) throw new AppError(404, 'GOAL_NOT_FOUND', 'Savings goal not found');
  const data = { ...req.body };
  if ('deadline' in data) data.deadline = data.deadline ? new Date(data.deadline) : null;
  const goal = await prisma.savingsGoal.update({ where: { id: exists.id }, data });
  res.json({ ...goal, target: number(goal.target), current: number(goal.current), monthly: goal.monthly === null ? null : number(goal.monthly) });
}

export async function deleteSavingsGoal(req, res) {
  const deleted = await prisma.savingsGoal.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!deleted.count) throw new AppError(404, 'GOAL_NOT_FOUND', 'Savings goal not found');
  res.status(204).end();
}

export async function listDebts(req, res) {
  const debts = await prisma.debt.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json(debts.map((debt) => ({
    ...debt,
    balance: number(debt.balance),
    rate: number(debt.annualRate),
    minimum: number(debt.minimumPayment),
  })));
}

export async function createDebt(req, res) {
  const debt = await prisma.debt.create({
    data: {
      name: req.body.name,
      balance: req.body.balance,
      annualRate: req.body.rate,
      minimumPayment: req.body.minimum,
      userId: req.user.id,
    },
  });
  res.status(201).json({ ...debt, balance: number(debt.balance), rate: number(debt.annualRate), minimum: number(debt.minimumPayment) });
}

export async function updateDebt(req, res) {
  const exists = await prisma.debt.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!exists) throw new AppError(404, 'DEBT_NOT_FOUND', 'Debt record not found');
  const debt = await prisma.debt.update({
    where: { id: exists.id },
    data: {
      ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body.balance !== undefined ? { balance: req.body.balance } : {}),
      ...(req.body.rate !== undefined ? { annualRate: req.body.rate } : {}),
      ...(req.body.minimum !== undefined ? { minimumPayment: req.body.minimum } : {}),
    },
  });
  res.json({ ...debt, balance: number(debt.balance), rate: number(debt.annualRate), minimum: number(debt.minimumPayment) });
}

export async function deleteDebt(req, res) {
  const deleted = await prisma.debt.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!deleted.count) throw new AppError(404, 'DEBT_NOT_FOUND', 'Debt record not found');
  res.status(204).end();
}

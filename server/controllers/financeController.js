import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { buildMonthlyInsights, evaluatePurchase, monthBounds } from '../services/financialContextService.js';
import {
  deletePendingDocument,
  getPendingDocument,
  listPendingDocuments,
  parseQuickAddText,
  publicDocument,
  uploadAndExtract,
} from '../services/documentExtractionService.js';
import { cleanCategory, isUnclearDescription, parseTransactionCsv } from '../services/transactionImportService.js';

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
  const transaction = await prisma.transaction.create({
    data: {
      ...req.body,
      merchant: String(req.body.merchant || '').trim(),
      description: req.body.description ? String(req.body.description).trim() : null,
      category: cleanCategory(req.body.category, clearText, req.body.type),
      type: req.body.type.toUpperCase(),
      amount: Math.abs(req.body.amount),
      occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
      userId: req.user.id,
      source: 'manual',
    },
  });
  res.status(201).json({ ...transaction, amount: signedAmount(transaction), type: transaction.type.toLowerCase() });
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

export async function getTransactionInsights(req, res) {
  res.json(await loadTransactionInsights(req.user.id));
}

export async function checkAffordability(req, res) {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, 'INVALID_PURCHASE_AMOUNT', 'Purchase amount must be greater than zero');
  }
  const insights = await loadTransactionInsights(req.user.id);
  res.json(evaluatePurchase(insights, {
    amount,
    category: req.body.category,
    description: req.body.description,
  }));
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
  return buildMonthlyInsights(transactions, { previousTransactions, debts, goals });
}

export async function deleteTransaction(req, res) {
  const deleted = await prisma.transaction.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!deleted.count) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  res.status(204).end();
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

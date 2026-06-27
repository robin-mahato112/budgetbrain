import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const number = (value) => Number(value);
const monthStart = (value = new Date()) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
const nextMonth = (value = new Date()) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
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
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user.id },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  });
  res.json(transactions.map((item) => ({ ...item, amount: signedAmount(item), type: item.type.toLowerCase() })));
}

export async function createTransaction(req, res) {
  const transaction = await prisma.transaction.create({
    data: {
      ...req.body,
      type: req.body.type.toUpperCase(),
      amount: Math.abs(req.body.amount),
      occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
      userId: req.user.id,
    },
  });
  res.status(201).json({ ...transaction, amount: signedAmount(transaction), type: transaction.type.toLowerCase() });
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

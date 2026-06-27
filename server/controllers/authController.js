import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const publicUser = (user) => ({ _id: user.id, name: user.name, email: user.email, role: user.role });
const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '15m' });
const preferences = new Map();
const defaultPreferences = {
  currency: 'AUD',
  paydayCadence: 'weekly',
  allowAiFinancialSummary: true,
  includeUploadedDocumentsInAi: false,
  requirePasswordForSensitiveChanges: true,
  sessionTimeoutMinutes: 30,
};

export async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'Email is already in use');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  res.status(201).json({ ...publicUser(user), token: tokenFor(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  res.json({ ...publicUser(user), token: tokenFor(user) });
}

export async function getMe(req, res) {
  res.json({ _id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
}

export async function exportMyData(req, res) {
  const data = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      chats: {
        orderBy: { createdAt: 'asc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      },
      budgets: true,
      transactions: true,
      savingsGoals: true,
      debts: true,
      aiUsage: true,
    },
  });
  res.json({ exportedAt: new Date().toISOString(), data });
}

export async function deleteMyAccount(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Password is incorrect');
  }
  await prisma.user.delete({ where: { id: req.user.id } });
  res.json({ message: 'Account and associated data deleted' });
}

export async function updateMyAccount(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  const wantsSensitiveChange = Boolean(req.body.email || req.body.newPassword);
  if (wantsSensitiveChange && !(await bcrypt.compare(req.body.currentPassword || '', user.passwordHash))) {
    throw new AppError(401, 'CURRENT_PASSWORD_REQUIRED', 'For your security, enter your current password to continue');
  }
  const data = {};
  if (req.body.name) data.name = String(req.body.name).trim().slice(0, 100);
  if (req.body.email) data.email = String(req.body.email).trim().toLowerCase().slice(0, 320);
  if (req.body.newPassword) data.passwordHash = await bcrypt.hash(String(req.body.newPassword), 12);
  if (!Object.keys(data).length) throw new AppError(400, 'NO_ACCOUNT_CHANGES', 'No account changes were provided');
  const updated = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json(publicUser(updated));
}

export async function getMyPreferences(req, res) {
  res.json({ ...defaultPreferences, ...(preferences.get(req.user.id) || {}) });
}

export async function updateMyPreferences(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(req.body.currentPassword || '', user.passwordHash))) {
    throw new AppError(401, 'CURRENT_PASSWORD_REQUIRED', 'For your security, enter your current password to continue');
  }
  const allowed = ['currency', 'paydayCadence', 'allowAiFinancialSummary', 'includeUploadedDocumentsInAi', 'requirePasswordForSensitiveChanges', 'sessionTimeoutMinutes'];
  const current = { ...defaultPreferences, ...(preferences.get(req.user.id) || {}) };
  for (const key of allowed) {
    if (key in req.body) current[key] = req.body[key];
  }
  preferences.set(req.user.id, current);
  res.json(current);
}

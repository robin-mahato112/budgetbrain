import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const publicUser = (user) => ({ _id: user.id, name: user.name, email: user.email, role: user.role });
const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '15m' });

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

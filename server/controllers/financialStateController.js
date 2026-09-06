import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { convertCurrency } from '../services/currencyService.js';
import { getFinancialState } from '../services/financialStateService.js';

export async function getCurrentFinancialState(req, res) {
  const state = await getFinancialState(req.user.id);
  if (!state) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  res.json(state);
}

export async function listProtectedCosts(req, res) {
  const costs = await prisma.protectedCost.findMany({ where: { userId: req.user.id }, orderBy: [{ enabled: 'desc' }, { nextDueDate: 'asc' }] });
  res.json(costs.map(publicCost));
}

export async function getProtectedCost(req, res) {
  const cost = await ownedCost(req.user.id, req.params.id);
  res.json(publicCost(cost));
}

export async function createProtectedCost(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { baseCurrency: true } });
  const conversion = await convertCurrency({ amount: req.body.amount, sourceCurrency: req.body.currency, targetCurrency: user?.baseCurrency || 'AUD', date: req.body.nextDueDate });
  const cost = await prisma.protectedCost.create({ data: {
    userId: req.user.id, name: req.body.name, category: req.body.category, classification: req.body.classification,
    amount: conversion.convertedAmount, originalAmount: conversion.originalAmount, currency: conversion.sourceCurrency,
    exchangeRate: conversion.exchangeRate, rateDate: conversion.rateDate, frequency: req.body.frequency,
    nextDueDate: req.body.nextDueDate, enabled: req.body.enabled,
  } });
  res.status(201).json({ protectedCost: publicCost(cost), financialState: await getFinancialState(req.user.id) });
}

export async function updateProtectedCost(req, res) {
  const existing = await ownedCost(req.user.id, req.params.id);
  const data = { ...req.body };
  if (req.body.amount !== undefined || req.body.currency !== undefined) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { baseCurrency: true } });
    const sourceCurrency = req.body.currency || existing.currency;
    const originalAmount = req.body.amount ?? existing.originalAmount ?? existing.amount;
    const conversion = await convertCurrency({ amount: originalAmount, sourceCurrency, targetCurrency: user?.baseCurrency || 'AUD', date: req.body.nextDueDate || existing.nextDueDate });
    Object.assign(data, { amount: conversion.convertedAmount, originalAmount: conversion.originalAmount, currency: conversion.sourceCurrency, exchangeRate: conversion.exchangeRate, rateDate: conversion.rateDate });
  }
  const cost = await prisma.protectedCost.update({ where: { id: existing.id }, data });
  res.json({ protectedCost: publicCost(cost), financialState: await getFinancialState(req.user.id) });
}

export async function deleteProtectedCost(req, res) {
  const existing = await ownedCost(req.user.id, req.params.id);
  await prisma.protectedCost.delete({ where: { id: existing.id } });
  res.json({ deleted: true, financialState: await getFinancialState(req.user.id) });
}

async function ownedCost(userId, id) {
  const cost = await prisma.protectedCost.findFirst({ where: { id, userId } });
  if (!cost) throw new AppError(404, 'PROTECTED_COST_NOT_FOUND', 'Protected cost not found');
  return cost;
}

function publicCost(cost) {
  return { ...cost, amount: Number(cost.amount), originalAmount: cost.originalAmount === null ? null : Number(cost.originalAmount), exchangeRate: cost.exchangeRate === null ? null : Number(cost.exchangeRate) };
}

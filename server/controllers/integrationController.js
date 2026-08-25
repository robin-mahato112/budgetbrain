import { AppError } from '../lib/errors.js';
import {
  completeYnabConnection, disconnectYnab, listYnabBudgets, selectYnabBudget,
  startYnabConnection, syncYnab, ynabStatus,
} from '../services/ynabIntegrationService.js';

export async function getYnabStatus(req, res) { res.json(await ynabStatus(req.user.id)); }
export function connectYnab(req, res) { res.json(startYnabConnection(req.user.id)); }
export async function ynabCallback(req, res) {
  if (!req.query.code || !req.query.state) throw new AppError(400, 'YNAB_CALLBACK_INVALID', 'YNAB callback is missing required information');
  res.redirect(await completeYnabConnection({ code: String(req.query.code), state: String(req.query.state) }));
}
export async function getYnabBudgets(req, res) { res.json(await listYnabBudgets(req.user.id)); }
export async function chooseYnabBudget(req, res) {
  const budgetId = String(req.body?.budgetId || '').trim();
  if (!budgetId || budgetId.length > 191) throw new AppError(400, 'YNAB_BUDGET_REQUIRED', 'Select a valid YNAB budget');
  res.json(await selectYnabBudget(req.user.id, budgetId, req.body?.name));
}
export async function runYnabSync(req, res) { res.json(await syncYnab(req.user.id)); }
export async function removeYnab(req, res) { res.json(await disconnectYnab(req.user.id, req.query.deleteHistory === 'true')); }

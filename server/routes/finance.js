import express from 'express';
import {
  createBudget,
  createDebt,
  createSavingsGoal,
  createTransaction,
  deleteBudget,
  deleteDebt,
  deleteSavingsGoal,
  deleteTransaction,
  getFinanceSummary,
  getSpendingTrend,
  listBudgets,
  listDebts,
  listSavingsGoals,
  listTransactions,
  updateBudget,
  updateDebt,
  updateSavingsGoal,
} from '../controllers/financeController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  budgetCreateSchema,
  budgetUpdateSchema,
  debtCreateSchema,
  debtUpdateSchema,
  goalCreateSchema,
  goalUpdateSchema,
  idParamsSchema,
  transactionCreateSchema,
} from '../validation/schemas.js';

const router = express.Router();
router.use(protect);

router.get('/summary', asyncHandler(getFinanceSummary));
router.get('/spending-trend', asyncHandler(getSpendingTrend));

router.get('/budgets', asyncHandler(listBudgets));
router.post('/budgets', validate(budgetCreateSchema), asyncHandler(createBudget));
router.patch('/budgets/:id', validate(idParamsSchema, 'params'), validate(budgetUpdateSchema), asyncHandler(updateBudget));
router.delete('/budgets/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteBudget));

router.get('/transactions', asyncHandler(listTransactions));
router.post('/transactions', validate(transactionCreateSchema), asyncHandler(createTransaction));
router.delete('/transactions/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteTransaction));

router.get('/savings-goals', asyncHandler(listSavingsGoals));
router.post('/savings-goals', validate(goalCreateSchema), asyncHandler(createSavingsGoal));
router.patch('/savings-goals/:id', validate(idParamsSchema, 'params'), validate(goalUpdateSchema), asyncHandler(updateSavingsGoal));
router.delete('/savings-goals/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteSavingsGoal));

router.get('/debts', asyncHandler(listDebts));
router.post('/debts', validate(debtCreateSchema), asyncHandler(createDebt));
router.patch('/debts/:id', validate(idParamsSchema, 'params'), validate(debtUpdateSchema), asyncHandler(updateDebt));
router.delete('/debts/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteDebt));

export default router;

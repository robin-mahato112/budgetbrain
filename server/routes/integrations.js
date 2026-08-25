import express from 'express';
import {
  chooseYnabBudget, connectYnab, getYnabBudgets, getYnabStatus, removeYnab, runYnabSync, ynabCallback,
} from '../controllers/integrationController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.get('/ynab/callback', asyncHandler(ynabCallback));
router.use(protect);
router.get('/ynab/status', asyncHandler(getYnabStatus));
router.get('/ynab/connect', connectYnab);
router.get('/ynab/budgets', asyncHandler(getYnabBudgets));
router.post('/ynab/select-budget', asyncHandler(chooseYnabBudget));
router.post('/ynab/sync', asyncHandler(runYnabSync));
router.delete('/ynab', asyncHandler(removeYnab));

export default router;

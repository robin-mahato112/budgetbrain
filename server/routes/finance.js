import express from 'express';
import {
  checkAffordability,
  confirmExtractedDocument,
  createTransaction,
  deleteDocumentPreview,
  deleteTransaction,
  getFinanceSummary,
  getTransactionInsights,
  importTransactions,
  previewCsvImport,
  confirmCsvImportPreview,
  getCsvImports,
  removeCsvImport,
  updateTransactionCategory,
  listRecurringPatterns,
  updateRecurringPattern,
  getPaydayForecast,
  savePaydayForecast,
  getTransaction,
  updateTransaction,
  markTransactionRecurring,
  listDocumentPreviews,
  listTransactions,
  quickAddPreview,
  uploadDocument,
} from '../controllers/financeController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, paydayConfigurationSchema, protectedCostCreateSchema, protectedCostUpdateSchema, transactionCreateSchema, transactionUpdateSchema } from '../validation/schemas.js';
import { createProtectedCost, deleteProtectedCost, getCurrentFinancialState, getProtectedCost, listProtectedCosts, updateProtectedCost } from '../controllers/financialStateController.js';

const router = express.Router();
router.use(protect);

router.get('/summary', asyncHandler(getFinanceSummary));
router.get('/insights', asyncHandler(getTransactionInsights));
router.post('/affordability', asyncHandler(checkAffordability));
router.get('/financial-state', asyncHandler(getCurrentFinancialState));
router.get('/payday', asyncHandler(getPaydayForecast));
router.put('/payday', validate(paydayConfigurationSchema), asyncHandler(savePaydayForecast));

router.get('/protected-costs', asyncHandler(listProtectedCosts));
router.post('/protected-costs', validate(protectedCostCreateSchema), asyncHandler(createProtectedCost));
router.get('/protected-costs/:id', validate(idParamsSchema, 'params'), asyncHandler(getProtectedCost));
router.patch('/protected-costs/:id', validate(idParamsSchema, 'params'), validate(protectedCostUpdateSchema), asyncHandler(updateProtectedCost));
router.delete('/protected-costs/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteProtectedCost));

router.get('/documents', asyncHandler(listDocumentPreviews));
router.post('/documents/upload', express.raw({ type: ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'], limit: '5mb' }), asyncHandler(uploadDocument));
router.post('/documents/quick-add', asyncHandler(quickAddPreview));
router.post('/documents/:id/confirm', validate(idParamsSchema, 'params'), asyncHandler(confirmExtractedDocument));
router.delete('/documents/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteDocumentPreview));

router.get('/transactions', asyncHandler(listTransactions));
router.post('/transactions', validate(transactionCreateSchema), asyncHandler(createTransaction));
router.post('/transactions/import', express.text({ type: ['text/csv', 'text/plain'], limit: '64kb' }), asyncHandler(importTransactions));
router.get('/transactions/imports', asyncHandler(getCsvImports));
router.post('/transactions/import/preview', express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }), asyncHandler(previewCsvImport));
router.post('/transactions/import/:id/confirm', validate(idParamsSchema, 'params'), asyncHandler(confirmCsvImportPreview));
router.delete('/transactions/import/:id', validate(idParamsSchema, 'params'), asyncHandler(removeCsvImport));
router.delete('/transactions/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteTransaction));
router.get('/transactions/:id', validate(idParamsSchema, 'params'), asyncHandler(getTransaction));
router.patch('/transactions/:id', validate(idParamsSchema, 'params'), validate(transactionUpdateSchema), asyncHandler(updateTransaction));
router.post('/transactions/:id/recurring', validate(idParamsSchema, 'params'), asyncHandler(markTransactionRecurring));
router.patch('/transactions/:id/category', validate(idParamsSchema, 'params'), asyncHandler(updateTransactionCategory));
router.get('/recurring', asyncHandler(listRecurringPatterns));
router.patch('/recurring/:id', validate(idParamsSchema, 'params'), asyncHandler(updateRecurringPattern));

export default router;

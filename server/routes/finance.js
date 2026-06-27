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
  listDocumentPreviews,
  listTransactions,
  quickAddPreview,
  uploadDocument,
} from '../controllers/financeController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, transactionCreateSchema } from '../validation/schemas.js';

const router = express.Router();
router.use(protect);

router.get('/summary', asyncHandler(getFinanceSummary));
router.get('/insights', asyncHandler(getTransactionInsights));
router.post('/affordability', asyncHandler(checkAffordability));

router.get('/documents', asyncHandler(listDocumentPreviews));
router.post('/documents/upload', express.raw({ type: ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'], limit: '5mb' }), asyncHandler(uploadDocument));
router.post('/documents/quick-add', asyncHandler(quickAddPreview));
router.post('/documents/:id/confirm', validate(idParamsSchema, 'params'), asyncHandler(confirmExtractedDocument));
router.delete('/documents/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteDocumentPreview));

router.get('/transactions', asyncHandler(listTransactions));
router.post('/transactions', validate(transactionCreateSchema), asyncHandler(createTransaction));
router.post('/transactions/import', express.text({ type: ['text/csv', 'text/plain'], limit: '64kb' }), asyncHandler(importTransactions));
router.delete('/transactions/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteTransaction));

export default router;

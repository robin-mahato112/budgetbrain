import express from 'express';
import { actionPlan, explainSafeToSpend, monthlySummary, sendMessage } from '../controllers/chatController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageSchema } from '../validation/schemas.js';

const router = express.Router();
router.use(protect);

router.post('/chat', validate(messageSchema), asyncHandler(sendMessage));
router.post('/monthly-diagnosis', asyncHandler(monthlySummary));
router.post('/action-plan', asyncHandler(actionPlan));
router.post('/explain-safe-to-spend', asyncHandler(explainSafeToSpend));

export default router;

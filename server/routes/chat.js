import express from 'express';
import { actionPlan, deleteChatRoute, getChatById, getChats, monthlySummary, sendMessage, usageStatus } from '../controllers/chatController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, messageSchema } from '../validation/schemas.js';

const router = express.Router();
router.use(protect);

router.post('/message', validate(messageSchema), asyncHandler(sendMessage));
router.post('/monthly-summary', asyncHandler(monthlySummary));
router.post('/action-plan', asyncHandler(actionPlan));
router.get('/usage', asyncHandler(usageStatus));
router.get('/', asyncHandler(getChats));
router.get('/:id', validate(idParamsSchema, 'params'), asyncHandler(getChatById));
router.delete('/:id', validate(idParamsSchema, 'params'), asyncHandler(deleteChatRoute));

export default router;

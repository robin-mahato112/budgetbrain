import express from 'express';
import { sendMessage, getChats, getChatById, deleteChatRoute } from '../controllers/chatController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/message', sendMessage);
router.get('/', getChats);
router.get('/:id', getChatById);
router.delete('/:id', deleteChatRoute);

export default router;
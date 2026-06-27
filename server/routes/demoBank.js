import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { connectBank, disconnectBank, getBalances, getDemoScenarios, getTransactions, syncAccounts } from '../services/bankSyncService.js';

const router = express.Router();
router.use(protect);

router.get('/scenarios', (req, res) => {
  res.json(getDemoScenarios());
});

router.post('/connect', asyncHandler(async (req, res) => {
  res.status(201).json(await connectBank(req.user.id, req.body?.scenario));
}));

router.post('/sync', asyncHandler(async (req, res) => {
  res.json(await syncAccounts(req.user.id, req.body?.scenario));
}));

router.get('/balances', asyncHandler(async (req, res) => {
  res.json(await getBalances(req.user.id));
}));

router.get('/transactions', asyncHandler(async (req, res) => {
  res.json(await getTransactions(req.user.id));
}));

router.delete('/disconnect', asyncHandler(async (req, res) => {
  res.json(await disconnectBank(req.user.id));
}));

export default router;

import express from 'express';
import { deleteMyAccount, exportMyData, getMe, login, register } from '../controllers/authController.js';
import { asyncHandler } from '../lib/errors.js';
import protect from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, passwordSchema, registerSchema } from '../validation/schemas.js';

const router = express.Router();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.get('/me', protect, asyncHandler(getMe));
router.get('/export', protect, asyncHandler(exportMyData));
router.delete('/account', protect, validate(passwordSchema), asyncHandler(deleteMyAccount));

export default router;

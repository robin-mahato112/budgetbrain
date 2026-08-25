import { z } from 'zod';

const money = z.coerce.number().finite().nonnegative().max(100000000);
const positiveMoney = money.positive();
const uuid = z.string().uuid();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128).regex(/[A-Za-z]/, 'Password must include a letter').regex(/\d/, 'Password must include a number'),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(128),
}).strict();

export const passwordSchema = z.object({ password: z.string().min(1).max(128) }).strict();
export const idParamsSchema = z.object({ id: uuid });
export const messageSchema = z.object({ message: z.string().trim().min(1).max(4000), chatId: uuid.optional().nullable() }).strict();

export const budgetCreateSchema = z.object({
  category: z.string().trim().min(1).max(80),
  limit: positiveMoney,
  month: z.coerce.date(),
  color: z.string().trim().max(20).optional().nullable(),
}).strict();
export const budgetUpdateSchema = budgetCreateSchema.pick({ limit: true, color: true }).partial().refine((data) => Object.keys(data).length > 0);

export const transactionCreateSchema = z.object({
  merchant: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  amount: positiveMoney,
  type: z.enum(['income', 'expense', 'saving']),
  occurredAt: z.coerce.date().optional(),
  description: z.string().trim().max(500).optional().nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
}).strict();
export const transactionUpdateSchema = transactionCreateSchema.partial().refine((data) => Object.keys(data).length > 0, 'Provide at least one transaction change');

export const protectedCostCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: positiveMoney,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('AUD'),
  category: z.enum(['HOUSING', 'GROCERIES', 'TRANSPORT', 'UTILITIES', 'INSURANCE', 'DEBT', 'SUBSCRIPTIONS', 'HEALTH', 'EDUCATION', 'REMITTANCE', 'OTHER_ESSENTIAL']),
  classification: z.enum(['FIXED', 'ADJUSTABLE_ESSENTIAL', 'OPTIONAL']).default('FIXED'),
  frequency: z.enum(['ONE_TIME', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('ONE_TIME'),
  nextDueDate: z.coerce.date(),
  enabled: z.boolean().default(true),
}).strict();
export const protectedCostUpdateSchema = protectedCostCreateSchema.partial().refine((data) => Object.keys(data).length > 0, 'Provide at least one protected-cost change');

export const paydayConfigurationSchema = z.object({
  currentBalance: z.coerce.number().finite().min(-100000000).max(100000000),
  nextPayday: z.coerce.date(),
  paydayConfirmed: z.boolean(),
  expectedIncome: money.default(0),
  incomeFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  safetyBuffer: money.default(0),
  holidayPaydayRule: z.enum(['PREVIOUS_BUSINESS_DAY', 'NEXT_BUSINESS_DAY', 'SAME_DATE', 'MANUAL']).optional().nullable(),
}).strict();

export const goalCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  target: positiveMoney,
  current: money.default(0),
  monthly: money.optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
}).strict();
export const goalUpdateSchema = goalCreateSchema.partial().refine((data) => Object.keys(data).length > 0);

export const debtCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  balance: positiveMoney,
  rate: z.coerce.number().finite().min(0).max(100),
  minimum: positiveMoney,
}).strict();
export const debtUpdateSchema = debtCreateSchema.partial().refine((data) => Object.keys(data).length > 0);

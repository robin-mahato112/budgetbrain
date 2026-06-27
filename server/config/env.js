import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  GROQ_API_KEY: z.string().min(1),
  CLIENT_URL: z.string().url(),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(25),
  AI_MONTHLY_LIMIT: z.coerce.number().int().positive().default(500),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';

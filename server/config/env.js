import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().positive().default(10),
  GROQ_API_KEY: z.string().optional().or(z.literal('')),
  GROQ_MODEL: z.string().min(1).default('llama-3.1-8b-instant'),
  GEMINI_API_KEY: z.string().optional().or(z.literal('')),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
  GEMINI_OCR_ENABLED: z.coerce.boolean().default(true),
  AI_FEATURES_ENABLED: z.coerce.boolean().default(true),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),
  UPLOADS_ENABLED: z.coerce.boolean().default(true),
  ALLOWED_UPLOAD_TYPES: z.string().default('png,jpg,jpeg,pdf,csv'),
  CLIENT_URL: z.string().url(),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(20),
  AI_MONTHLY_LIMIT: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';

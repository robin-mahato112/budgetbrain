import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'token',
      '*.token',
      'GROQ_API_KEY',
      'JWT_SECRET',
      'DATABASE_URL',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'budgetbrain-api', environment: env.NODE_ENV },
});

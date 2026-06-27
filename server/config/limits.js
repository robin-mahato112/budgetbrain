import { env } from './env.js';

export const AI_LIMITS = Object.freeze({
  daily: env.AI_DAILY_LIMIT,
  monthly: env.AI_MONTHLY_LIMIT,
});

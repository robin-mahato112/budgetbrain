import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

export const sentryEnabled = Boolean(env.SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
  });
}

export { Sentry };

import { Prisma } from '@prisma/client';
import { isProduction } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Sentry, sentryEnabled } from '../lib/sentry.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

export function errorHandler(error, req, res, next) {
  let normalized = error;

  if (error.type === 'entity.parse.failed') {
    normalized = new AppError(400, 'INVALID_JSON', 'Request body contains invalid JSON');
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      normalized = new AppError(409, 'CONFLICT', 'A record with this value already exists');
    } else if (error.code === 'P2025') {
      normalized = new AppError(404, 'NOT_FOUND', 'The requested record was not found');
    } else {
      normalized = new AppError(500, 'DATABASE_ERROR', 'A database operation failed');
    }
  }

  const statusCode = normalized.statusCode || 500;
  const code = normalized.code || 'INTERNAL_ERROR';
  const message = normalized.isOperational ? normalized.message : 'An unexpected error occurred';

  logger.error({
    err: normalized,
    requestId: req.id,
    userId: req.user?.id,
    route: req.originalUrl,
    statusCode,
  }, 'request failed');

  if (sentryEnabled && statusCode >= 500) Sentry.captureException(normalized);

  res.status(statusCode).json({
    message,
    error: {
      code,
      message,
      ...(normalized.details ? { details: normalized.details } : {}),
      ...(!isProduction && !normalized.isOperational ? { stack: normalized.stack } : {}),
    },
  });
}

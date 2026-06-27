import crypto from 'crypto';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env, isProduction } from './config/env.js';
import { AppError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { asyncHandler } from './lib/errors.js';
import { prisma } from './lib/prisma.js';
import './lib/sentry.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import financeRoutes from './routes/finance.js';

export function createApp() {
  const app = express();
  const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = isProduction ? [env.CLIENT_URL] : [...new Set([env.CLIENT_URL, ...developmentOrigins])];

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(pinoHttp({
    logger,
    autoLogging: false,
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customProps: (req) => ({ userId: req.user?.id }),
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError(403, 'CORS_DENIED', 'Origin is not allowed'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on('finish', () => {
      req.log.info({
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        responseTimeMs: Number((performance.now() - startedAt).toFixed(1)),
        userId: req.user?.id,
      }, 'request completed');
    });
    next();
  });
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 300 : 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests', error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  }));

  app.get('/health', asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  }));
  app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 30 : 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts', error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts' } },
  }), authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/finance', financeRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { cmdbRouter } from './routes/cmdb';
import { eventsRouter } from './routes/events';
import { incidentsRouter } from './routes/incidents';
import { monitoringRouter } from './routes/monitoring';
import { itsmRouter } from './routes/itsm';
import { availabilityRouter } from './routes/availability';
import { capacityRouter } from './routes/capacity';
import { integrationsRouter } from './routes/integrations';
import { platformRouter } from './routes/platform';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { HttpError } from './util';
import { requireAuth, sessionMiddleware } from './middleware/auth';
import { logger } from './logger';
import { prisma } from './db';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  // ── Security headers ──────────────────────────────────────────────────────
  // CSP is opt-in via env. In dev the Vite origin needs `'unsafe-inline'` etc.
  // so we leave CSP off; in prod set `CSP_ENABLED=true` and override directives
  // through `CSP_CONNECT_SRC` (CSV) for any extra origins (e.g. analytics).
  const cspEnabled = process.env.CSP_ENABLED === 'true';
  const extraConnect = (process.env.CSP_CONNECT_SRC ?? '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(helmet({
    contentSecurityPolicy: cspEnabled ? {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'connect-src': ["'self'", 'ws:', 'wss:', ...extraConnect],
        'img-src': ["'self'", 'data:', 'blob:'],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
      },
    } : false,
  }));

  // ── Request logging (skipped under tests for clean output) ─────────────────
  if (!isTest) {
    app.use(pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // ── Rate limits ────────────────────────────────────────────────────────────
  // Auth endpoints: per-IP, slows credential stuffing.
  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: isTest ? 1_000 : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/v1/auth/', authLimiter);

  app.use(sessionMiddleware);

  // Per-tenant limiter on the wider API surface. Once the session middleware
  // resolves `req.tenantId`, throttle requests keyed by tenant so a single
  // noisy customer can't crowd out others. Falls back to IP when unresolved.
  const tenantLimiter = rateLimit({
    windowMs: 60_000,
    max: isTest ? 10_000 : Number(process.env.TENANT_RATE_LIMIT ?? 600),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req, res) => req.tenantId ?? ipKeyGenerator(req.ip ?? 'unknown'),
  });
  app.use('/api/v1/', tenantLimiter);

  // ── Operational endpoints ──────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  app.get('/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch (e) {
      res.status(503).json({ status: 'degraded', error: (e as Error).message });
    }
  });

  const api = express.Router();
  // Public auth surface: login/logout/me handle their own session checks.
  api.use(authRouter);
  // M6.9: global auth gate. Every route below requires a valid session, so
  // `req.tenantId` and `req.permissions` are guaranteed to be set. Without this,
  // unauthenticated requests would reach repositories with `req.tenantId =
  // undefined`, which Prisma silently treats as "no filter" — a cross-tenant
  // read. Per-route `requirePermission(...)` guards layer on top of this.
  api.use(requireAuth);
  api.use(adminRouter);
  api.use(cmdbRouter);
  api.use(eventsRouter);
  api.use(incidentsRouter);
  api.use(monitoringRouter);
  api.use(itsmRouter);
  api.use(availabilityRouter);
  api.use(capacityRouter);
  api.use(integrationsRouter);
  api.use(platformRouter);
  app.use('/api/v1', api);

  app.use('/api/v1', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });

  const errorHandler: ErrorRequestHandler = (err, req, res, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message, body: err.body });
      return;
    }
    if (err && typeof err === 'object' && 'issues' in err) {
      res.status(400).json({ message: 'Validation failed', issues: (err as { issues: unknown }).issues });
      return;
    }
    logger.error({ err, path: req.path }, 'unhandled error');
    res.status(500).json({ message: 'Internal server error' });
  };
  app.use(errorHandler);

  return app;
};

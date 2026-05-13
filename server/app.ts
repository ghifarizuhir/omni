import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import { sessionMiddleware } from './middleware/auth';
import { logger } from './logger';
import { prisma } from './db';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  // ── Security headers ──────────────────────────────────────────────────────
  // CSP defaults are restrictive; the SPA is served from a separate origin in
  // dev (Vite) so we let the proxy handle headers there. In production the
  // CSP would be configured by whichever edge serves the static bundle.
  app.use(helmet({ contentSecurityPolicy: false }));

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

  // ── Rate limit on auth to slow credential stuffing ─────────────────────────
  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: isTest ? 1_000 : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/v1/auth/', authLimiter);

  app.use(sessionMiddleware);

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
  api.use(authRouter);
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

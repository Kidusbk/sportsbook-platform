import { Router } from 'express';
import type { Request, Response } from 'express';
import { checkDatabaseConnection } from '../../db/pool.js';
import { config } from '../../config/index.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: config.app.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseConnection();
  const status = dbOk ? 'ready' : 'not_ready';
  const httpStatus = dbOk ? 200 : 503;
  res.status(httpStatus).json({
    success: dbOk,
    data: {
      status,
      checks: { database: dbOk ? 'ok' : 'error', redis: 'skipped' },
      timestamp: new Date().toISOString(),
    },
  });
});

export { router as healthRouter };

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@sportsbook/shared';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
    return;
  }

  logger.error('Unhandled error', {
    requestId: req.requestId, error: err.message,
    stack: config.isDev ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProd ? 'An unexpected error occurred' : err.message,
    },
    meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
    meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
  });
}

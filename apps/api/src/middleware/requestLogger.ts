import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!SENSITIVE_HEADERS.has(key.toLowerCase()) && typeof value === 'string') {
      headers[key] = value;
    }
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId: req.requestId, method: req.method, url: req.originalUrl,
      statusCode: res.statusCode, duration: `${duration}ms`,
      ip: req.ip, userAgent: req.get('user-agent'),
    });
  });

  next();
}

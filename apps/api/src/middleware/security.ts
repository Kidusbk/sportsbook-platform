import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config/index.js';
import type { RequestHandler } from 'express';

export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: config.isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

export const corsMiddleware: RequestHandler = cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,
});

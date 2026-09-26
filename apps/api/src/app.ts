import express from 'express';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { securityHeaders, corsMiddleware } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/v1/health.js';
import { authRouter } from './routes/v1/auth.js';
import { REQUEST_BODY_LIMIT } from '@sportsbook/shared';

export const app = express();

// Middleware (order matters)
app.use(requestId);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: REQUEST_BODY_LIMIT }));
app.use(requestLogger);
app.use(generalLimiter);

// Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', authRouter);

// Error handling
app.use('/api', notFoundHandler);
app.use(errorHandler);

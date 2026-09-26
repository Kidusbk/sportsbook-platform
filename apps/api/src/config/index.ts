import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  app: {
    name: process.env.APP_NAME || 'sportsbook-platform',
    port: parseInt(process.env.APP_PORT || '3001', 10),
    host: process.env.APP_HOST || '0.0.0.0',
    url: process.env.APP_URL || 'http://localhost:3001',
    webUrl: process.env.WEB_URL || 'http://localhost:5173',
    version: '0.1.0',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'sportsbook_dev',
    user: process.env.DB_USER || 'sportsbook',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || '',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10', 10),
  },
  features: {
    registration: process.env.ENABLE_REGISTRATION !== 'false',
    mfa: process.env.ENABLE_MFA === 'true',
  },
  log: { level: process.env.LOG_LEVEL || 'info' },
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

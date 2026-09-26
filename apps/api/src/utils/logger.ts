import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[(config.log.level as LogLevel) ?? 'info'] ?? 1;

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (config.isDev) {
    const prefix = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}${metaStr}`;
  }
  return JSON.stringify({ timestamp, level, message, ...meta });
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < currentLevel) return;
  const formatted = formatMessage(level, message, meta);
  if (level === 'error') console.error(formatted);
  else if (level === 'warn') console.warn(formatted);
  else console.log(formatted); // eslint-disable-line no-console
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};

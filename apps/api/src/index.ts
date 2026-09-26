import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const server = app.listen(config.app.port, config.app.host, () => {
  logger.info(`🚀 ${config.app.name} v${config.app.version} running`, {
    host: config.app.host, port: config.app.port, env: config.env,
  });
});

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
for (const signal of signals) {
  process.on(signal, () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => { process.exit(0); });
    setTimeout(() => { process.exit(1); }, 10000);
  });
}

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { error: String(reason) });
});

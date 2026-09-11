import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

let server;

async function start() {
  await connectDatabase();
  server = app.listen(env.port, () => logger.info(`API listening on port ${env.port}`));
}

async function shutdown(signal) {
  logger.info(`${signal} received; shutting down`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', { error });
  shutdown('unhandledRejection');
});

start().catch((error) => {
  logger.error('Startup failed', { error });
  process.exit(1);
});

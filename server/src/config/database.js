import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { autoIndex: env.nodeEnv !== 'production' });
  logger.info('MongoDB connected');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';

async function seed() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
  }
  await connectDatabase();
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    logger.info('Admin already exists', { email: existing.email });
    return;
  }
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash: ADMIN_PASSWORD,
    role: 'admin',
  });
  logger.info('Admin created', { email: ADMIN_EMAIL });
}

seed()
  .catch((error) => {
    logger.error('Admin seed failed', { message: error.message });
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);

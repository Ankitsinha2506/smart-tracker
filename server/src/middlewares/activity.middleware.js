import { ActivityLog } from '../models/ActivityLog.js';
import { logger } from '../config/logger.js';

export async function recordActivity(request, action, entityType, entityId, metadata = {}) {
  try {
    await ActivityLog.create({
      actor: request.user?._id,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: request.id,
    });
  } catch (error) {
    logger.warn('Activity log write failed', { message: error.message, action, entityId });
  }
}

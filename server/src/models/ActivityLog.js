import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, trim: true, maxlength: 100, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ['User', 'Student', 'ApplyHistory', 'Technology', 'Report'],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    changes: { type: mongoose.Schema.Types.Mixed, select: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true, maxlength: 500 },
    requestId: { type: String, trim: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

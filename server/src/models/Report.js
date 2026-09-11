import mongoose from 'mongoose';
import { REPORT_FORMATS, REPORT_STATUSES, REPORT_TYPES } from '../constants/domain.constants.js';

const reportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: Object.values(REPORT_TYPES), required: true, index: true },
    format: { type: String, enum: Object.values(REPORT_FORMATS), required: true },
    dateRange: { from: { type: Date, required: true }, to: { type: Date, required: true } },
    filters: {
      technologies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Technology' }],
      trainers: [{ type: String, trim: true }],
      batches: [{ type: String, trim: true }],
      membershipType: { type: String, enum: ['paid', 'free'] },
      studentStatus: { type: String, enum: ['active', 'inactive', 'placed'] },
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUSES),
      default: REPORT_STATUSES.PENDING,
      index: true,
    },
    storageKey: { type: String, trim: true, select: false },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    sizeBytes: { type: Number, min: 0 },
    rowCount: { type: Number, min: 0 },
    failureReason: { type: String, trim: true, maxlength: 1000 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: Date,
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true },
);

reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: 1 });

reportSchema.pre('validate', function validateDateRange() {
  if (this.dateRange?.from > this.dateRange?.to) {
    this.invalidate('dateRange.to', 'Report end date cannot be before start date');
  }
});

export const Report = mongoose.model('Report', reportSchema);

import mongoose from 'mongoose';

const applyHistorySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    applicationDate: { type: Date, required: true },
    previousCount: { type: Number, required: true, min: 0 },
    currentCount: { type: Number, required: true, min: 0 },
    dailyCount: { type: Number, required: true, min: 0 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['student', 'staff', 'admin', 'system'], required: true },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, optimisticConcurrency: true },
);

applyHistorySchema.index({ student: 1, applicationDate: 1 }, { unique: true });
applyHistorySchema.index({ applicationDate: -1 });
applyHistorySchema.index({ student: 1, applicationDate: -1, dailyCount: -1 });

applyHistorySchema.pre('validate', function calculateDailyCount() {
  if (this.currentCount < this.previousCount) {
    this.invalidate('currentCount', 'Current count cannot be less than previous count');
    return;
  }
  this.dailyCount = this.currentCount - this.previousCount;
  if (this.applicationDate) this.applicationDate.setUTCHours(0, 0, 0, 0);
});

export const ApplyHistory = mongoose.model('ApplyHistory', applyHistorySchema);

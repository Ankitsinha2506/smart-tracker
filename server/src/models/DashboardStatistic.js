import mongoose from 'mongoose';

const dashboardStatisticSchema = new mongoose.Schema(
  {
    snapshotDate: { type: Date, required: true },
    period: { type: String, enum: ['daily', 'monthly'], required: true },
    totals: {
      students: { type: Number, default: 0, min: 0 },
      activeStudents: { type: Number, default: 0, min: 0 },
      paidUsers: { type: Number, default: 0, min: 0 },
      freeUsers: { type: Number, default: 0, min: 0 },
      applications: { type: Number, default: 0, min: 0 },
      averageApplicationsPerStudent: { type: Number, default: 0, min: 0 },
    },
    technologyBreakdown: [
      {
        technology: { type: mongoose.Schema.Types.ObjectId, ref: 'Technology' },
        applications: { type: Number, min: 0, default: 0 },
        students: { type: Number, min: 0, default: 0 },
      },
    ],
    batchBreakdown: [
      {
        batch: { type: String, trim: true },
        applications: { type: Number, min: 0, default: 0 },
        students: { type: Number, min: 0, default: 0 },
      },
    ],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

dashboardStatisticSchema.index({ period: 1, snapshotDate: 1 }, { unique: true });
dashboardStatisticSchema.index({ snapshotDate: -1 });

export const DashboardStatistic = mongoose.model('DashboardStatistic', dashboardStatisticSchema);

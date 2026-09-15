import { Student } from '../models/Student.js';
import { ApplyHistory } from '../models/ApplyHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { addUtcDays, businessDate, endOfUtcDay } from '../utils/date.js';

export function workspaceScope(actor) {
  if (actor.role === 'admin') return { deletedAt: null };
  if (actor.role === 'staff') return { deletedAt: null, createdBy: actor._id };
  if (actor.role === 'student' && actor.student) return { deletedAt: null, _id: actor.student };
  throw new ApiError(403, 'No candidate profile is linked to this account');
}

export async function getWorkspace(actor) {
  const scope = workspaceScope(actor);
  const today = businessDate();
  const from = addUtcDays(today, -29);
  const ids = await Student.distinct('_id', scope);
  const historyScope = { student: { $in: ids } };
  const updatedIds = await ApplyHistory.distinct('student', {
    ...historyScope, applicationDate: { $gte: today, $lte: endOfUtcDay(today) },
  });
  const pendingScope = { ...scope, status: 'active', _id: { $in: ids, $nin: updatedIds } };
  const [stats, pendingCount, attention, trend, recent, profile] = await Promise.all([
    Student.aggregate([
      { $match: scope },
      { $group: { _id: null, total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        placed: { $sum: { $cond: [{ $eq: ['$status', 'placed'] }, 1, 0] } },
        applications: { $sum: '$currentTotalApplicationCount' } } },
    ]),
    Student.countDocuments(pendingScope),
    Student.find(pendingScope)
      .select('candidateName currentTotalApplicationCount previousDayApplicationCount lastApplicationUpdateDate createdBy')
      .populate('createdBy', 'name').sort({ lastApplicationUpdateDate: 1, _id: 1 }).limit(8).lean(),
    ApplyHistory.aggregate([
      { $match: { ...historyScope, applicationDate: { $gte: from, $lte: endOfUtcDay(today) } } },
      { $group: { _id: '$applicationDate', applications: { $sum: '$dailyCount' } } },
      { $sort: { _id: 1 } },
    ]),
    ApplyHistory.find(historyScope).select('student recordedBy dailyCount createdAt applicationDate')
      .populate('student', 'candidateName').populate('recordedBy', 'name')
      .sort({ updatedAt: -1 }).limit(6).lean(),
    actor.role === 'student'
      ? Student.findOne(scope).select('candidateName membershipType status lastApplicationUpdateDate currentTotalApplicationCount previousDayApplicationCount').lean()
      : null,
  ]);
  const trendMap = new Map(trend.map(row => [row._id.toISOString().slice(0, 10), row.applications]));
  const dailyTrend = Array.from({ length: 30 }, (_, index) => {
    const date = addUtcDays(from, index).toISOString().slice(0, 10);
    return { date, applications: trendMap.get(date) || 0 };
  });
  return {
    generatedAt: new Date(), profile, attention, recent, dailyTrend,
    cards: { ...stats[0], pending: pendingCount, updated: (stats[0]?.active || 0) - pendingCount,
      todayApplications: trendMap.get(today.toISOString().slice(0, 10)) || 0 },
  };
}

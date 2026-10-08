import { ApplyHistory } from '../models/ApplyHistory.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { addUtcDays, businessDate, endOfUtcDay, startOfUtcDay } from '../utils/date.js';

const total = (result) => result[0]?.total || 0;
// Application dates are business-day labels; createdAt is a real UTC instant.
const registrationBoundary = (date) => new Date(date.getTime() - 330 * 60_000);

export async function getDashboard(fromInput, toInput, actor, staffId, filters = {}) {
  const today = businessDate();
  const yesterday = addUtcDays(today, -1);
  let from = startOfUtcDay(fromInput || addUtcDays(today, -29));
  const to = endOfUtcDay(toInput || today);

  const scopedActor =
    actor?.role === 'staff'
      ? actor._id
      : staffId && mongoose.isValidObjectId(staffId)
        ? new mongoose.Types.ObjectId(staffId)
        : null;

  const actorMatch = scopedActor ? { recordedBy: scopedActor } : {};
  const studentMatch = { deletedAt: null, ...(scopedActor && { createdBy: scopedActor }) };
  if (filters.technology) studentMatch.technology = new mongoose.Types.ObjectId(filters.technology);
  if (filters.status) studentMatch.status = filters.status;
  if (filters.membershipType) studentMatch.membershipType = filters.membershipType;
  const activeStudentIds = await Student.find(studentMatch).distinct('_id');
  const historyScope = { ...actorMatch, student: { $in: activeStudentIds } };

  if (filters.allTime) {
    const first = await ApplyHistory.findOne(historyScope)
      .sort({ applicationDate: 1 })
      .select('applicationDate')
      .lean();
    const firstCandidate = await Student.findOne(studentMatch)
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();
    const firstRegistration = firstCandidate?.createdAt
      ? startOfUtcDay(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(firstCandidate.createdAt),
        )
      : today;
    from = startOfUtcDay(
      new Date(
        Math.min(new Date(first?.applicationDate || today).getTime(), firstRegistration.getTime()),
      ),
    );
  }
  const dateMatch = { applicationDate: { $gte: from, $lte: to } };
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  // Compare equal elapsed calendar days, capped to the previous month's length.
  const lastMonthTo = endOfUtcDay(
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() - 1,
        Math.min(
          today.getUTCDate(),
          new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).getUTCDate(),
        ),
      ),
    ),
  );
  const [
    studentCounts,
    todayResult,
    yesterdayResult,
    monthlyResult,
    overallResult,
    rawDailyTrend,
    monthlyTrend,
    technologyWise,
    topStudents,
    membershipDistribution,
    batchWise,
    recentActivity,
    registrationTrend,
    candidateTechnologies,
    lastMonthApplications,
    registrationsThisMonth,
    registrationsLastMonth,
    updatedToday,
    totalRecruiters,
  ] = await Promise.all([
    Student.aggregate([
      { $match: studentMatch },
      {
        $group: {
          _id: null,
          students: { $sum: 1 },
          activeStudents: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          placedStudents: { $sum: { $cond: [{ $eq: ['$status', 'placed'] }, 1, 0] } },
          paidUsers: { $sum: { $cond: [{ $eq: ['$membershipType', 'paid'] }, 1, 0] } },
          overallApplications: { $sum: '$currentTotalApplicationCount' },
        },
      },
    ]),
    ApplyHistory.aggregate([
      { $match: { applicationDate: { $gte: today, $lte: endOfUtcDay(today) }, ...historyScope } },
      { $group: { _id: null, total: { $sum: '$dailyCount' } } },
    ]),
    ApplyHistory.aggregate([
      { $match: { applicationDate: { $gte: yesterday, $lt: today }, ...historyScope } },
      { $group: { _id: null, total: { $sum: '$dailyCount' } } },
    ]),
    ApplyHistory.aggregate([
      {
        $match: {
          ...historyScope,
          applicationDate: {
            $gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
            $lte: endOfUtcDay(today),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$dailyCount' } } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...dateMatch, ...historyScope } },
      { $group: { _id: null, total: { $sum: '$dailyCount' } } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...dateMatch, ...historyScope } },
      { $group: { _id: '$applicationDate', applications: { $sum: '$dailyCount' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', applications: 1 } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...dateMatch, ...historyScope } },
      {
        $group: {
          _id: { year: { $year: '$applicationDate' }, month: { $month: '$applicationDate' } },
          applications: { $sum: '$dailyCount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { _id: 0, year: '$_id.year', month: '$_id.month', applications: 1 } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...dateMatch, ...historyScope } },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentData',
        },
      },
      { $unwind: '$studentData' },
      { $match: { 'studentData.deletedAt': null } },
      { $group: { _id: '$studentData.technology', applications: { $sum: '$dailyCount' } } },
      {
        $lookup: { from: 'technologies', localField: '_id', foreignField: '_id', as: 'technology' },
      },
      { $unwind: '$technology' },
      { $project: { _id: 0, technology: '$technology.name', applications: 1 } },
      { $sort: { applications: -1 } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...dateMatch, ...historyScope } },
      { $group: { _id: '$student', applications: { $sum: '$dailyCount' } } },
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $match: { 'student.deletedAt': null } },
      {
        $lookup: {
          from: 'technologies',
          localField: 'student.technology',
          foreignField: '_id',
          as: 'tech',
        },
      },
      { $unwind: { path: '$tech', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'student.createdBy',
          foreignField: '_id',
          as: 'creator',
        },
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      { $sort: { applications: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          candidateName: '$student.candidateName',
          personalEmail: '$student.personalEmail',
          technology: '$tech.name',
          totalApplications: '$student.currentTotalApplicationCount',
          todayApplications: '$student.todayApplicationCount',
          applications: 1,
          staffName: '$creator.name',
        },
      },
    ]),
    Student.aggregate([
      { $match: studentMatch },
      { $group: { _id: '$membershipType', students: { $sum: 1 } } },
      { $project: { _id: 0, membershipType: '$_id', students: 1 } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...dateMatch, ...historyScope } },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentData',
        },
      },
      { $unwind: '$studentData' },
      { $match: { 'studentData.deletedAt': null } },
      {
        $group: {
          _id: '$studentData.batch',
          applications: { $sum: '$dailyCount' },
          students: { $addToSet: '$student' },
        },
      },
      { $project: { _id: 0, batch: '$_id', applications: 1, students: { $size: '$students' } } },
      { $sort: { applications: -1 } },
    ]),
    ApplyHistory.find({ ...dateMatch, ...historyScope })
      .populate('student', 'candidateName personalEmail currentTotalApplicationCount')
      .populate('recordedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10),
    Student.aggregate([
      {
        $match: {
          ...studentMatch,
          createdAt: { $gte: registrationBoundary(from), $lte: registrationBoundary(to) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' },
          },
          candidates: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Student.aggregate([
      { $match: studentMatch },
      { $group: { _id: '$technology', candidates: { $sum: 1 } } },
      {
        $lookup: { from: 'technologies', localField: '_id', foreignField: '_id', as: 'technology' },
      },
      { $unwind: '$technology' },
      { $project: { _id: 0, technology: '$technology.name', candidates: 1 } },
      { $sort: { candidates: -1 } },
    ]),
    ApplyHistory.aggregate([
      { $match: { ...historyScope, applicationDate: { $gte: lastMonthStart, $lte: lastMonthTo } } },
      { $group: { _id: null, total: { $sum: '$dailyCount' } } },
    ]),
    Student.countDocuments({
      ...studentMatch,
      createdAt: {
        $gte: registrationBoundary(monthStart),
        $lte: registrationBoundary(endOfUtcDay(today)),
      },
    }),
    Student.countDocuments({
      ...studentMatch,
      createdAt: {
        $gte: registrationBoundary(lastMonthStart),
        $lte: registrationBoundary(lastMonthTo),
      },
    }),
    ApplyHistory.distinct('student', {
      ...historyScope,
      applicationDate: { $gte: today, $lte: endOfUtcDay(today) },
    }),
    User.countDocuments({
      role: 'staff',
      status: 'active',
      deletedAt: null,
      ...(scopedActor && { _id: scopedActor }),
    }),
  ]);

  // Fill in all calendar dates for a seamless day-by-day progression chart
  const dailyMap = new Map(
    rawDailyTrend.map((item) => [item.date.toISOString().slice(0, 10), item.applications]),
  );
  const registrationMap = new Map(registrationTrend.map((item) => [item._id, item.candidates]));
  const dailyTrend = [];
  let cumulative = 0;
  let cursor = new Date(from);
  const endDate = new Date(to);

  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    const applications = dailyMap.get(key) || 0;
    cumulative += applications;
    dailyTrend.push({
      date: key,
      applications,
      cumulative,
      candidates: registrationMap.get(key) || 0,
    });
    cursor = addUtcDays(cursor, 1);
  }

  const counts = studentCounts[0] || {
    students: 0,
    activeStudents: 0,
    placedStudents: 0,
    paidUsers: 0,
    overallApplications: 0,
  };

  let staffPerformance = [];
  if (actor?.role === 'admin' && !scopedActor) {
    const staffUsers = await User.find({ role: 'staff', status: 'active', deletedAt: null }).select(
      'name email',
    );
    // Group the team in three queries rather than querying once per recruiter.
    const [studentStats, periodStats, todayStats] = await Promise.all([
      Student.aggregate([
        { $match: studentMatch },
        {
          $group: {
            _id: '$createdBy',
            count: { $sum: 1 },
            overall: { $sum: '$currentTotalApplicationCount' },
            placed: { $sum: { $cond: [{ $eq: ['$status', 'placed'] }, 1, 0] } },
          },
        },
      ]),
      ApplyHistory.aggregate([
        { $match: { ...historyScope, ...dateMatch } },
        { $group: { _id: '$recordedBy', total: { $sum: '$dailyCount' } } },
      ]),
      ApplyHistory.aggregate([
        { $match: { ...historyScope, applicationDate: { $gte: today, $lte: endOfUtcDay(today) } } },
        { $group: { _id: '$recordedBy', total: { $sum: '$dailyCount' } } },
      ]),
    ]);
    const byId = (rows) => new Map(rows.map((row) => [String(row._id), row]));
    const candidateMap = byId(studentStats),
      periodMap = byId(periodStats),
      todayMap = byId(todayStats);
    staffPerformance = staffUsers.map((staff) => {
      const stats = candidateMap.get(String(staff._id)) || {};
      return {
        staffId: staff._id,
        name: staff.name,
        email: staff.email,
        totalStudents: stats.count || 0,
        placedStudents: stats.placed || 0,
        applications: periodMap.get(String(staff._id))?.total || 0,
        todayApplications: todayMap.get(String(staff._id))?.total || 0,
        overallApplications: stats.overall || 0,
        averagePerStudent: stats.count ? Number((stats.overall / stats.count).toFixed(1)) : 0,
      };
    });
    staffPerformance.sort((a, b) => b.applications - a.applications);
  }

  let selectedStaffInfo = null;
  if (scopedActor) {
    const staffDoc = await User.findById(scopedActor).select('name email role');
    if (staffDoc) {
      selectedStaffInfo = {
        _id: staffDoc._id,
        name: staffDoc.name,
        email: staffDoc.email,
        role: staffDoc.role,
      };
      if (staffDoc.role === 'staff')
        staffPerformance = [
          {
            staffId: staffDoc._id,
            name: staffDoc.name,
            email: staffDoc.email,
            totalStudents: counts.students,
            placedStudents: counts.placedStudents,
            applications: total(overallResult),
            todayApplications: total(todayResult),
            overallApplications: counts.overallApplications,
            averagePerStudent: counts.students
              ? Number((counts.overallApplications / counts.students).toFixed(1))
              : 0,
          },
        ];
    }
  }

  return {
    generatedAt: new Date(),
    range: { from, to },
    comparisons: {
      monthlyApplications: {
        current: total(monthlyResult),
        previous: total(lastMonthApplications),
      },
      registrations: { current: registrationsThisMonth, previous: registrationsLastMonth },
    },
    selectedStaff: selectedStaffInfo,
    cards: {
      totalStudents: counts.students,
      totalRecruiters,
      updatedToday: updatedToday.length,
      activeStudents: counts.activeStudents,
      placedStudents: counts.placedStudents,
      paidUsers: counts.paidUsers,
      freeUsers: counts.students - counts.paidUsers,
      todayApplications: total(todayResult),
      yesterdayApplications: total(yesterdayResult),
      monthlyApplications: total(monthlyResult),
      overallApplications: counts.overallApplications,
      rangeApplications: total(overallResult),
      averageApplicationsPerStudent: counts.students
        ? Number((counts.overallApplications / counts.students).toFixed(2))
        : 0,
    },
    charts: {
      dailyTrend,
      monthlyTrend,
      technologyWise,
      candidateTechnologies,
      topStudents,
      membershipDistribution,
      batchWise,
      staffPerformance,
      recentActivity,
    },
  };
}

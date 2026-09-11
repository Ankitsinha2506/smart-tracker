import { ApplyHistory } from '../models/ApplyHistory.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { addUtcDays, businessDate, endOfUtcDay, startOfUtcDay } from '../utils/date.js';

const total = (result) => result[0]?.total || 0;

export async function getDashboard(fromInput, toInput, actor, staffId) {
  const today = businessDate();
  const yesterday = addUtcDays(today, -1);
  const from = startOfUtcDay(fromInput || addUtcDays(today, -29));
  const to = endOfUtcDay(toInput || today);
  const dateMatch = { applicationDate: { $gte: from, $lte: to } };

  const scopedActor =
    actor?.role === 'staff'
      ? actor._id
      : staffId && mongoose.isValidObjectId(staffId)
        ? new mongoose.Types.ObjectId(staffId)
        : null;

  const actorMatch = scopedActor ? { recordedBy: scopedActor } : {};
  const studentMatch = { deletedAt: null, ...(scopedActor && { createdBy: scopedActor }) };
  const activeStudentIds = await Student.find(studentMatch).distinct('_id');
  const historyScope = { ...actorMatch, student: { $in: activeStudentIds } };

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
  ]);

  // Fill in all calendar dates for a seamless day-by-day progression chart
  const dailyMap = new Map(
    rawDailyTrend.map((item) => [item.date.toISOString().slice(0, 10), item.applications]),
  );
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
    staffPerformance = await Promise.all(
      staffUsers.map(async (staff) => {
        const [studentStats, rangeAppStats, todayAppStats] = await Promise.all([
          Student.aggregate([
            { $match: { createdBy: staff._id, deletedAt: null } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                overall: { $sum: '$currentTotalApplicationCount' },
              },
            },
          ]),
          ApplyHistory.aggregate([
            {
              $match: {
                recordedBy: staff._id,
                applicationDate: { $gte: from, $lte: to },
              },
            },
            { $group: { _id: null, total: { $sum: '$dailyCount' } } },
          ]),
          ApplyHistory.aggregate([
            {
              $match: {
                recordedBy: staff._id,
                applicationDate: { $gte: today, $lte: endOfUtcDay(today) },
              },
            },
            { $group: { _id: null, total: { $sum: '$dailyCount' } } },
          ]),
        ]);

        const totalStudents = studentStats[0]?.count || 0;
        const overallApplications = studentStats[0]?.overall || 0;
        const periodApplications = rangeAppStats[0]?.total || 0;
        const todayApplications = todayAppStats[0]?.total || 0;

        return {
          staffId: staff._id,
          name: staff.name,
          email: staff.email,
          totalStudents,
          applications: periodApplications,
          todayApplications,
          overallApplications,
          averagePerStudent: totalStudents
            ? Number((overallApplications / totalStudents).toFixed(1))
            : 0,
        };
      }),
    );
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
    }
  }

  return {
    range: { from, to },
    selectedStaff: selectedStaffInfo,
    cards: {
      totalStudents: counts.students,
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
      topStudents,
      membershipDistribution,
      batchWise,
      staffPerformance,
      recentActivity,
    },
  };
}

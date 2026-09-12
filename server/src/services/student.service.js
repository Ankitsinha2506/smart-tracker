import mongoose from 'mongoose';
import { ApplyHistory } from '../models/ApplyHistory.js';
import { Student } from '../models/Student.js';
import { Technology } from '../models/Technology.js';
import { ApiError } from '../utils/ApiError.js';
import { businessDate, endOfUtcDay, startOfUtcDay } from '../utils/date.js';
import { createStudentSchema } from '../validators/student.validator.js';

const sortOptions = {
  name_asc: { candidateName: 1 },
  name_desc: { candidateName: -1 },
  applications_high: { currentTotalApplicationCount: -1 },
  applications_low: { currentTotalApplicationCount: 1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listStudents(query, actor) {
  const filter = { deletedAt: null };
  if (actor?.role === 'staff') filter.createdBy = actor._id;
  else if (actor?.role === 'admin' && query.staff) filter.createdBy = query.staff;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = ['candidateName', 'mobileNumber', 'personalEmail', 'naukriEmail'].map((field) => ({
      [field]: pattern,
    }));
  }
  if (query.technology) filter.technology = query.technology;
  if (query.membershipType) filter.membershipType = query.membershipType;
  if (query.status) filter.status = query.status;
  if (query.from || query.to)
    filter.createdAt = {
      ...(query.from && { $gte: startOfUtcDay(query.from) }),
      ...(query.to && { $lte: endOfUtcDay(query.to) }),
    };
  if (query.minApplications !== undefined || query.maxApplications !== undefined)
    filter.currentTotalApplicationCount = {
      ...(query.minApplications !== undefined && { $gte: query.minApplications }),
      ...(query.maxApplications !== undefined && { $lte: query.maxApplications }),
    };
  const skip = (query.page - 1) * query.limit;
  const [studentDocuments, total] = await Promise.all([
    Student.find(filter)
      .populate('technology', 'name slug')
      .populate('createdBy', 'name email role')
      .sort(sortOptions[query.sort])
      .skip(skip)
      .limit(query.limit),
    Student.countDocuments(filter),
  ]);
  const countFrom = startOfUtcDay(query.countFrom || businessDate());
  const countTo = endOfUtcDay(query.countTo || query.countFrom || businessDate());
  const periodCounts = await ApplyHistory.aggregate([
    {
      $match: {
        student: { $in: studentDocuments.map((student) => student._id) },
        applicationDate: { $gte: countFrom, $lte: countTo },
      },
    },
    { $group: { _id: '$student', count: { $sum: '$dailyCount' } } },
  ]);
  const countByStudent = new Map(periodCounts.map((item) => [item._id.toString(), item.count]));
  const items = studentDocuments.map((student) => ({
    ...student.toJSON(),
    periodApplicationCount: countByStudent.get(student._id.toString()) || 0,
  }));
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function createStudent(input, actorId) {
  const technologyExists = await Technology.exists({ _id: input.technology, isActive: true });
  if (!technologyExists) throw new ApiError(422, 'Technology is invalid or inactive');
  const { naukriPassword, currentTotalApplicationCount, ...profile } = input;
  const student = new Student({
    ...profile,
    currentTotalApplicationCount,
    previousDayApplicationCount: currentTotalApplicationCount,
    todayApplicationCount: 0,
    createdBy: actorId,
    updatedBy: actorId,
  });
  student.setNaukriPassword(naukriPassword);
  await student.save();
  return student;
}

export async function importStudents(rows, actorId) {
  const technologies = await Technology.find();
  const technologyByName = new Map(technologies.map((item) => [item.name.toLowerCase(), item]));
  const usedSlugs = new Set(technologies.map((item) => item.slug));
  const createdTechnologies = [];
  const results = [];
  for (const row of rows) {
    try {
      const technologyName = String(row.technology || '').trim();
      if (!technologyName) throw new ApiError(422, 'Technology is required');
      const technologyKey = technologyName.toLowerCase();
      let technology = technologyByName.get(technologyKey);
      if (!technology) {
        const slugBase =
          technologyName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'technology';
        let slug = slugBase;
        let suffix = 2;
        while (usedSlugs.has(slug)) slug = `${slugBase}-${suffix++}`;
        technology = await Technology.create({
          name: technologyName,
          slug,
          description: 'Automatically added during student Excel import.',
          isActive: true,
          createdBy: actorId,
          updatedBy: actorId,
        });
        technologyByName.set(technologyKey, technology);
        usedSlugs.add(slug);
        createdTechnologies.push(technology.name);
      } else if (!technology.isActive) {
        technology.isActive = true;
        technology.updatedBy = actorId;
        await technology.save();
      }
      const { sourceRow, ...input } = row;
      const validated = createStudentSchema.validate(
        { ...input, technology: technology._id.toString() },
        {
          abortEarly: false,
          stripUnknown: true,
        },
      );
      if (validated.error)
        throw new ApiError(422, validated.error.details.map((detail) => detail.message).join('; '));
      const student = await createStudent(validated.value, actorId);
      results.push({
        row: sourceRow,
        success: true,
        id: student._id,
        candidateName: student.candidateName,
      });
    } catch (error) {
      const duplicateField =
        error.code === 11000 ? Object.keys(error.keyPattern || error.keyValue || {})[0] : null;
      results.push({
        row: row.sourceRow,
        success: false,
        message: duplicateField
          ? `A student with this ${duplicateField} already exists`
          : error.message,
      });
    }
  }
  return {
    imported: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    createdTechnologies,
    results,
  };
}

export async function getStudent(id) {
  const student = await Student.findOne({ _id: id, deletedAt: null }).populate([
    { path: 'technology', select: 'name slug' },
    { path: 'createdBy', select: 'name email role' },
  ]);
  if (!student) throw new ApiError(404, 'Student not found');
  const todayCount = await ApplyHistory.aggregate([
    {
      $match: {
        student: student._id,
        applicationDate: { $gte: businessDate(), $lte: endOfUtcDay(businessDate()) },
      },
    },
    { $group: { _id: null, count: { $sum: '$dailyCount' } } },
  ]);
  return { ...student.toJSON(), todayApplicationCount: todayCount[0]?.count || 0 };
}

export async function assertStaffStudentAccess(id, actor) {
  if (actor.role !== 'staff') return;
  const allowed = await Student.exists({ _id: id, createdBy: actor._id, deletedAt: null });
  if (!allowed) throw new ApiError(403, 'You can access only students added by you');
}

export async function getNaukriCredential(id) {
  const student = await Student.findOne({ _id: id, deletedAt: null }).select('+naukriCredential');
  if (!student) throw new ApiError(404, 'Student not found');
  return { password: student.getNaukriPassword() };
}

export async function updateStudent(id, input, actorId) {
  const student = await Student.findOne({ _id: id, deletedAt: null }).select('+naukriCredential');
  if (!student) throw new ApiError(404, 'Student not found');
  if (input.technology && !(await Technology.exists({ _id: input.technology, isActive: true })))
    throw new ApiError(422, 'Technology is invalid or inactive');
  const nextMembership = input.membershipType || student.membershipType;
  const nextPaidMonth = input.membershipPaidMonth || student.membershipPaidMonth;
  if (nextMembership === 'paid' && !nextPaidMonth)
    throw new ApiError(422, 'Paid month is required for paid membership');
  const { naukriPassword, ...profile } = input;
  if (nextMembership === 'free') profile.membershipPaidMonth = undefined;
  Object.assign(student, profile, { updatedBy: actorId });
  if (naukriPassword) student.setNaukriPassword(naukriPassword);
  await student.save();
  return getStudent(id);
}

export async function deleteStudent(id, actorId) {
  const student = await Student.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { status: 'inactive', deletedAt: new Date(), updatedBy: actorId },
    { new: true },
  );
  if (!student) throw new ApiError(404, 'Student not found');
  return student;
}

export async function updateApplicationCount(studentId, newTotal, actorId, source, note) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const student = await Student.findOne({ _id: studentId, deletedAt: null }).session(session);
      if (!student) throw new ApiError(404, 'Student not found');
      if (newTotal < student.currentTotalApplicationCount)
        throw new ApiError(422, 'Current total cannot be lower than the last recorded total');
      const applicationDate = businessDate();
      const existing = await ApplyHistory.findOne({
        student: student._id,
        applicationDate,
      }).session(session);
      const previousCount = existing
        ? existing.previousCount
        : student.currentTotalApplicationCount;
      const history = await ApplyHistory.findOneAndUpdate(
        { student: student._id, applicationDate },
        {
          $set: {
            currentCount: newTotal,
            dailyCount: newTotal - previousCount,
            recordedBy: actorId,
            source,
            note,
          },
          $setOnInsert: { previousCount },
        },
        { new: true, upsert: true, runValidators: true, session, setDefaultsOnInsert: true },
      );
      student.previousDayApplicationCount = previousCount;
      student.currentTotalApplicationCount = newTotal;
      student.todayApplicationCount = newTotal - previousCount;
      student.lastApplicationUpdateDate = new Date();
      student.updatedBy = actorId;
      await student.save({ session });
      result = { student, history };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function getDailyApplicationMatrix(query = {}, actor) {
  const filter = { deletedAt: null };
  if (actor?.role === 'staff') filter.createdBy = actor._id;
  else if (actor?.role === 'admin' && query.staff) filter.createdBy = query.staff;

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = ['candidateName', 'mobileNumber', 'personalEmail', 'naukriEmail'].map((field) => ({
      [field]: pattern,
    }));
  }
  if (query.technology) filter.technology = query.technology;
  if (query.status) filter.status = query.status;

  const defaultTo = businessDate();
  const defaultFrom = startOfUtcDay(
    new Date(Date.UTC(defaultTo.getUTCFullYear(), defaultTo.getUTCMonth(), 1)),
  );
  const fromDate = startOfUtcDay(query.from || defaultFrom);
  const toDate = endOfUtcDay(query.to || defaultTo);

  const days = [];
  const curr = startOfUtcDay(fromDate);
  const end = startOfUtcDay(toDate);
  while (curr <= end) {
    const iso = curr.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    }).format(curr);
    const dayName = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
    }).format(curr);
    days.push({ key: iso, label, dayName, date: new Date(curr) });
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  const students = await Student.find(filter)
    .populate('technology', 'name slug')
    .populate('createdBy', 'name email role')
    .sort({ candidateName: 1 });

  if (!students.length) {
    return {
      dateRange: { from: fromDate, to: toDate },
      days,
      totals: {
        totalStudents: 0,
        startingTotal: 0,
        periodAppliedTotal: 0,
        endingTotal: 0,
        dailyTotals: Object.fromEntries(days.map((d) => [d.key, 0])),
      },
      students: [],
    };
  }

  const studentIds = students.map((s) => s._id);

  const periodHistory = await ApplyHistory.find({
    student: { $in: studentIds },
    applicationDate: { $gte: fromDate, $lte: toDate },
  }).sort({ applicationDate: 1 });

  const studentDayMap = new Map();
  const firstPeriodEntryByStudent = new Map();
  for (const h of periodHistory) {
    const sId = h.student.toString();
    const dKey = h.applicationDate.toISOString().slice(0, 10);
    if (!studentDayMap.has(sId)) studentDayMap.set(sId, new Map());
    studentDayMap.get(sId).set(dKey, h.dailyCount);
    if (!firstPeriodEntryByStudent.has(sId)) {
      firstPeriodEntryByStudent.set(sId, h);
    }
  }

  const priorHistory = await ApplyHistory.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        applicationDate: { $lt: fromDate },
      },
    },
    { $sort: { applicationDate: -1 } },
    {
      $group: {
        _id: '$student',
        lastCount: { $first: '$currentCount' },
      },
    },
  ]);
  const priorCountByStudent = new Map(priorHistory.map((p) => [p._id.toString(), p.lastCount]));

  const dailyTotals = Object.fromEntries(days.map((d) => [d.key, 0]));
  let startingTotal = 0;
  let periodAppliedTotal = 0;
  let endingTotal = 0;

  const studentRows = students.map((student) => {
    const sId = student._id.toString();
    const sMap = studentDayMap.get(sId) || new Map();

    let startingCount = 0;
    if (priorCountByStudent.has(sId)) {
      startingCount = priorCountByStudent.get(sId);
    } else if (firstPeriodEntryByStudent.has(sId)) {
      startingCount = firstPeriodEntryByStudent.get(sId).previousCount;
    } else {
      startingCount = student.currentTotalApplicationCount || 0;
    }

    const dailyCounts = {};
    let periodApplied = 0;

    for (const d of days) {
      const count = sMap.get(d.key) || 0;
      dailyCounts[d.key] = count;
      periodApplied += count;
      dailyTotals[d.key] += count;
    }

    const endingCount = startingCount + periodApplied;

    startingTotal += startingCount;
    periodAppliedTotal += periodApplied;
    endingTotal += endingCount;

    return {
      _id: student._id,
      candidateName: student.candidateName,
      mobileNumber: student.mobileNumber,
      personalEmail: student.personalEmail,
      naukriEmail: student.naukriEmail,
      technology: student.technology,
      batch: student.batch,
      trainerName: student.trainerName,
      city: student.city,
      collegeName: student.collegeName,
      membershipType: student.membershipType,
      status: student.status,
      createdBy: student.createdBy,
      startingCount,
      dailyCounts,
      periodApplied,
      endingCount,
    };
  });

  return {
    dateRange: { from: fromDate, to: toDate },
    days,
    totals: {
      totalStudents: students.length,
      startingTotal,
      periodAppliedTotal,
      endingTotal,
      dailyTotals,
    },
    students: studentRows,
  };
}

export async function bulkDeleteStudents({ scope, ids, staff }, actor) {
  if (!['admin', 'staff'].includes(actor.role)) throw new ApiError(403, 'Not authorized to delete candidates');
  const filter = { deletedAt: null };
  if (actor.role === 'staff') filter.createdBy = actor._id;
  if (scope === 'selected') filter._id = { $in: ids };
  else if (scope === 'staff') {
    if (!staff || (actor.role !== 'admin' && String(actor._id) !== staff)) throw new ApiError(403, 'Not authorized for this staff member');
    filter.createdBy = staff;
  }
  else if (scope !== 'all') throw new ApiError(422, 'Invalid deletion scope');
  const result = await Student.updateMany(filter, {
    $set: { status: 'inactive', deletedAt: new Date(), updatedBy: actor._id },
  });
  return { deletedCount: result.modifiedCount };
}

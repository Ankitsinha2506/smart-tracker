import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { ApplyHistory } from '../models/ApplyHistory.js';
import { Student } from '../models/Student.js';
import { Notification } from '../models/Notification.js';
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
  const constraints = [];
  if (actor?.role === 'staff') {
    filter.status = { $ne: 'placed' };
    constraints.push({ $or: [{ assignedTo: actor._id }, { assignedTo: { $exists: false }, createdBy: actor._id }] });
  } else if (actor?.role === 'admin' && query.staff) constraints.push({ $or: [{ assignedTo: query.staff }, { assignedTo: { $exists: false }, createdBy: query.staff }] });
  if (actor?.role === 'admin' && query.unassigned) {
    const adminIds = await User.distinct('_id', { role: 'admin' });
    filter.assignedTo = { $in: [null, ...adminIds] };
    filter.status = { $ne: 'placed' };
    const legacyStaffIds = await User.distinct('_id', { role: 'staff' });
    filter.createdBy = { $nin: legacyStaffIds };
  }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    constraints.push({ $or: ['candidateName', 'mobileNumber', 'personalEmail', 'naukriEmail'].map((field) => ({
      [field]: pattern,
    })) });
  }
  if (constraints.length) filter.$and = constraints;
  if (query.technology) filter.technology = query.technology;
  if (query.membershipType) filter.membershipType = query.membershipType;
  if (query.status && !(actor?.role === 'staff' && query.status === 'placed')) filter.status = query.status;
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
      .populate('assignedTo', 'name email role')
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

async function notifyStaffAssignment(staffId, students, actorName) {
  if (!students.length) return;
  const names = students.slice(0, 8).map((student) => student.candidateName);
  const suffix = students.length > names.length ? ` and ${students.length - names.length} more` : '';
  await Notification.create({
    recipient: staffId,
    type: 'student.assigned',
    title: students.length === 1 ? 'Candidate assigned to you' : 'Candidates assigned to you',
    message: `${names.join(', ')}${suffix} assigned by ${actorName}.`,
    students: students.map((student) => student._id),
  });
}

export async function createStudent(input, actor, { notify = true } = {}) {
  const technologyExists = await Technology.exists({ _id: input.technology, isActive: true });
  if (!technologyExists) throw new ApiError(422, 'Technology is invalid or inactive');
  const { naukriPassword, currentTotalApplicationCount, assignedTo, ...profile } = input;
  const creator = await User.findById(actor._id).select('name role');
  if (assignedTo && actor.role !== 'admin') throw new ApiError(403, 'Only admins can assign candidates to staff');
  const targetId = assignedTo || (creator?.role === 'staff' ? actor._id : null);
  if (targetId && !(await User.exists({ _id: targetId, role: 'staff', status: 'active', deletedAt: null })))
    throw new ApiError(422, 'Select an active staff member');
  const student = new Student({
    ...profile,
    currentTotalApplicationCount,
    previousDayApplicationCount: currentTotalApplicationCount,
    todayApplicationCount: 0,
    createdBy: actor._id,
    ...(targetId && { assignedTo: targetId }),
    updatedBy: actor._id,
  });
  student.setNaukriPassword(naukriPassword);
  await student.save();
  if (notify && assignedTo) await notifyStaffAssignment(assignedTo, [student], creator.name || 'an admin');
  return student;
}

export async function importStudents(rows, actor, assignedTo) {
  if (assignedTo && actor.role !== 'admin') throw new ApiError(403, 'Only admins can assign candidates to staff');
  const assigningStaff = assignedTo
    ? await User.findOne({ _id: assignedTo, role: 'staff', status: 'active', deletedAt: null }).select('_id')
    : null;
  if (assignedTo && !assigningStaff) throw new ApiError(422, 'Select an active staff member');
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
          createdBy: actor._id,
          updatedBy: actor._id,
        });
        technologyByName.set(technologyKey, technology);
        usedSlugs.add(slug);
        createdTechnologies.push(technology.name);
      } else if (!technology.isActive) {
        technology.isActive = true;
        technology.updatedBy = actor._id;
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
      const student = await createStudent({ ...validated.value, ...(assigningStaff && { assignedTo: assigningStaff._id }) }, actor, { notify: false });
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
  if (assigningStaff) {
    const importedIds = results.filter((item) => item.success).map((item) => item.id);
    const assignedStudents = await Student.find({ _id: { $in: importedIds } }).select('_id candidateName');
    const actorRecord = await User.findById(actor._id).select('name');
    await notifyStaffAssignment(assigningStaff._id, assignedStudents, actorRecord?.name || 'an admin');
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
    { path: 'assignedTo', select: 'name email role' },
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
  const allowed = await Student.exists({ _id: id, status: { $ne: 'placed' }, deletedAt: null, $or: [{ assignedTo: actor._id }, { assignedTo: { $exists: false }, createdBy: actor._id }] });
  if (!allowed) throw new ApiError(403, 'You can access only candidates assigned to you');
}

export async function getNaukriCredential(id) {
  const student = await Student.findOne({ _id: id, deletedAt: null }).select('+naukriCredential');
  if (!student) throw new ApiError(404, 'Student not found');
  return { password: student.getNaukriPassword() };
}

export async function updateStudent(id, input, actor) {
  const student = await Student.findOne({ _id: id, deletedAt: null }).select('+naukriCredential');
  if (!student) throw new ApiError(404, 'Student not found');
  if (input.technology && !(await Technology.exists({ _id: input.technology, isActive: true })))
    throw new ApiError(422, 'Technology is invalid or inactive');
  const nextMembership = input.membershipType || student.membershipType;
  const nextPaidMonth = input.membershipPaidMonth || student.membershipPaidMonth;
  if (nextMembership === 'paid' && !nextPaidMonth)
    throw new ApiError(422, 'Paid month is required for paid membership');
  const { naukriPassword, assignedTo, ...profile } = input;
  let assignedStaff = null;
  const previousAssignee = String(student.assignedTo || '');
  if (Object.hasOwn(input, 'assignedTo')) {
    if (actor.role !== 'admin') throw new ApiError(403, 'Only admins can assign candidates to staff');
    if (assignedTo) {
      assignedStaff = await User.findOne({ _id: assignedTo, role: 'staff', status: 'active', deletedAt: null }).select('_id');
      if (!assignedStaff) throw new ApiError(422, 'Select an active staff member');
      profile.assignedTo = assignedStaff._id;
    } else {
      profile.assignedTo = undefined;
    }
  }
  if (nextMembership === 'free') profile.membershipPaidMonth = undefined;
  Object.assign(student, profile, { updatedBy: actor._id });
  if (naukriPassword) student.setNaukriPassword(naukriPassword);
  await student.save();
  if (assignedStaff && String(assignedStaff._id) !== previousAssignee)
    await notifyStaffAssignment(assignedStaff._id, [student], actor.name || 'an admin');
  return getStudent(id);
}

export async function assignStudents(ids, staffId, actorId) {
  const staff = await User.findOne({ _id: staffId, role: 'staff', status: 'active', deletedAt: null }).select('_id');
  if (!staff) throw new ApiError(422, 'Select an active staff member');
  const found = await Student.countDocuments({ _id: { $in: ids }, deletedAt: null });
  if (found !== ids.length) throw new ApiError(404, 'One or more candidates were not found');
  const candidates = await Student.find({ _id: { $in: ids }, deletedAt: null }).select('_id candidateName assignedTo');
  const reassigned = candidates.filter((candidate) => String(candidate.assignedTo || '') !== String(staff._id));
  const result = await Student.updateMany(
    { _id: { $in: ids }, deletedAt: null },
    { $set: { assignedTo: staff._id, updatedBy: actorId } },
  );
  const actor = await User.findById(actorId).select('name');
  await notifyStaffAssignment(staff._id, reassigned, actor?.name || 'an admin');
  return { assignedCount: result.matchedCount };
}

export async function deleteStudent(id) {
  const result = await permanentlyDeleteCandidates({ _id: id });
  if (!result.deletedCount) throw new ApiError(404, 'Student not found');
  return { _id: id };
}

// Keep candidate records, history and linked login accounts atomic.
async function permanentlyDeleteCandidates(filter, allWorkspace = false) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const ids = await Student.distinct('_id', filter).session(session);
      const linked = { student: { $in: ids } };
      await ApplyHistory.deleteMany(allWorkspace ? {} : linked, { session });
      await User.deleteMany({ ...linked, role: 'student' }, { session });
      result = await Student.deleteMany({ _id: { $in: ids } }, { session });
    });
    return { deletedCount: result.deletedCount };
  } finally {
    await session.endSession();
  }
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
  const constraints = [];
  if (actor?.role === 'staff') { filter.status = { $ne: 'placed' }; constraints.push({ $or: [{ assignedTo: actor._id }, { assignedTo: { $exists: false }, createdBy: actor._id }] }); }
  else if (actor?.role === 'admin' && query.staff) constraints.push({ $or: [{ assignedTo: query.staff }, { assignedTo: { $exists: false }, createdBy: query.staff }] });

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    constraints.push({ $or: ['candidateName', 'mobileNumber', 'personalEmail', 'naukriEmail'].map((field) => ({
      [field]: pattern,
    })) });
  }
  if (constraints.length) filter.$and = constraints;
  if (query.technology) filter.technology = query.technology;
  if (query.status && !(actor?.role === 'staff' && query.status === 'placed')) filter.status = query.status;

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
    .populate('assignedTo', 'name email role')
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
      assignedTo:
        student.assignedTo?.role === 'staff'
          ? student.assignedTo
          : student.createdBy?.role === 'staff'
            ? student.createdBy
            : null,
      currentTotalApplicationCount: student.currentTotalApplicationCount,
      previousDayApplicationCount: student.previousDayApplicationCount,
      lastApplicationUpdateDate: student.lastApplicationUpdateDate,
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
  const filter = {};
  if (actor.role === 'staff') {
    filter.status = { $ne: 'placed' };
    filter.$or = [{ assignedTo: actor._id }, { assignedTo: { $exists: false }, createdBy: actor._id }];
  }
  if (scope === 'selected') filter._id = { $in: ids };
  else if (scope === 'staff') {
    if (!staff || (actor.role !== 'admin' && String(actor._id) !== staff)) throw new ApiError(403, 'Not authorized for this staff member');
    filter.$or = [{ assignedTo: staff }, { assignedTo: { $exists: false }, createdBy: staff }];
  }
  else if (scope !== 'all') throw new ApiError(422, 'Invalid deletion scope');
  return permanentlyDeleteCandidates(filter, scope === 'all' && actor.role === 'admin');
}

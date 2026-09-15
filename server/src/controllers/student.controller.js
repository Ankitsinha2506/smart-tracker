import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { USER_ROLES } from '../constants/domain.constants.js';
import { recordActivity } from '../middlewares/activity.middleware.js';
import * as service from '../services/student.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function permittedStudentId(request) {
  if ([USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(request.user.role)) return request.params.id;
  if (!request.user.student)
    throw new ApiError(403, 'No student profile is linked to this account');
  if (request.params.id && request.params.id !== request.user.student.toString())
    throw new ApiError(403, 'You can access only your own profile');
  return request.user.student.toString();
}

export const list = asyncHandler(async (request, response) => {
  const result = await service.listStudents(request.query, request.user);
  return sendSuccess(response, { data: result.items, meta: { pagination: result.pagination } });
});
export const create = asyncHandler(async (request, response) => {
  const student = await service.createStudent(request.body, request.user._id);
  await recordActivity(request, 'student.created', 'Student', student._id);
  return sendSuccess(response, { statusCode: 201, message: 'Student created', data: student });
});
export const importStudents = asyncHandler(async (request, response) => {
  const result = await service.importStudents(request.body.rows, request.user._id);
  await recordActivity(request, 'student.imported', 'Student', request.user._id, {
    imported: result.imported,
    failed: result.failed,
  });
  return sendSuccess(response, { message: `${result.imported} students imported`, data: result });
});
export const getOne = asyncHandler(async (request, response) => {
  await service.assertStaffStudentAccess(request.params.id, request.user);
  return sendSuccess(response, { data: await service.getStudent(permittedStudentId(request)) });
});
export const getMine = asyncHandler(async (request, response) =>
  sendSuccess(response, { data: await service.getStudent(permittedStudentId(request)) }),
);
export const getNaukriCredential = asyncHandler(async (request, response) => {
  await service.assertStaffStudentAccess(request.params.id, request.user);
  const credential = await service.getNaukriCredential(request.params.id);
  response.set('Cache-Control', 'no-store');
  await recordActivity(request, 'student.naukri-credential.viewed', 'Student', request.params.id);
  return sendSuccess(response, { data: credential });
});
export const update = asyncHandler(async (request, response) => {
  await service.assertStaffStudentAccess(request.params.id, request.user);
  const student = await service.updateStudent(request.params.id, request.body, request.user._id);
  await recordActivity(request, 'student.updated', 'Student', student._id);
  return sendSuccess(response, { message: 'Student updated', data: student });
});
export const remove = asyncHandler(async (request, response) => {
  await service.assertStaffStudentAccess(request.params.id, request.user);
  const student = await service.deleteStudent(request.params.id, request.user._id);
  await recordActivity(request, 'student.deleted', 'Student', student._id);
  return sendSuccess(response, { message: 'Student deleted' });
});
export const updateCount = asyncHandler(async (request, response) => {
  await service.assertStaffStudentAccess(request.params.id, request.user);
  const id = permittedStudentId(request);
  const result = await service.updateApplicationCount(
    id,
    request.body.currentTotalApplicationCount,
    request.user._id,
    request.user.role,
    request.body.note,
  );
  await recordActivity(request, 'application-count.updated', 'ApplyHistory', result.history._id, {
    student: id,
    dailyCount: result.history.dailyCount,
  });
  return sendSuccess(response, { message: 'Application count updated', data: result });
});

export const getDailyMatrix = asyncHandler(async (request, response) => {
  const result = await service.getDailyApplicationMatrix(request.query, request.user);
  return sendSuccess(response, { data: result });
});

export const bulkRemove = asyncHandler(async (request, response) => {
  const result = await service.bulkDeleteStudents(request.body, request.user);
  await recordActivity(request, 'student.bulk-deleted', 'Student', request.user._id, {
    scope: request.body.scope, staff: request.body.staff, ids: request.body.ids, deletedCount: result.deletedCount,
  });
  return sendSuccess(response, { message: `${result.deletedCount} candidates deleted`, data: result });
});

export const owners = asyncHandler(async (_request, response) => {
  const ownerIds = await Student.distinct('createdBy', { deletedAt: null });
  const users = await User.find({ $or: [
    { role: { $in: ['admin', 'staff'] }, deletedAt: null },
    { _id: { $in: ownerIds } },
  ] }).select('_id name email role status').sort({ name: 1 }).lean();
  return sendSuccess(response, { data: users });
});

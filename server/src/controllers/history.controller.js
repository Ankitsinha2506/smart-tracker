import { USER_ROLES } from '../constants/domain.constants.js';
import { ApplyHistory } from '../models/ApplyHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { endOfUtcDay, startOfUtcDay } from '../utils/date.js';

const sorts = {
  newest: { applicationDate: -1 },
  oldest: { applicationDate: 1 },
  applications_high: { dailyCount: -1 },
  applications_low: { dailyCount: 1 },
};

export const list = asyncHandler(async (request, response) => {
  const filter = {};
  if (request.user.role === USER_ROLES.STUDENT) {
    if (!request.user.student)
      throw new ApiError(403, 'No student profile is linked to this account');
    filter.student = request.user.student;
  } else if (request.user.role === USER_ROLES.STAFF) {
    filter.recordedBy = request.user._id;
  } else if (request.user.role === USER_ROLES.ADMIN && request.query.staff) {
    filter.recordedBy = request.query.staff;
  }
  if (request.query.student) filter.student = request.query.student;
  if (request.query.from || request.query.to)
    filter.applicationDate = {
      ...(request.query.from && { $gte: startOfUtcDay(request.query.from) }),
      ...(request.query.to && { $lte: endOfUtcDay(request.query.to) }),
    };
  const skip = (request.query.page - 1) * request.query.limit;
  const [items, total] = await Promise.all([
    ApplyHistory.find(filter)
      .populate('student', 'candidateName personalEmail')
      .populate('recordedBy', 'name email role')
      .sort(sorts[request.query.sort])
      .skip(skip)
      .limit(request.query.limit),
    ApplyHistory.countDocuments(filter),
  ]);
  return sendSuccess(response, {
    data: items,
    meta: {
      pagination: {
        page: request.query.page,
        limit: request.query.limit,
        total,
        pages: Math.ceil(total / request.query.limit),
      },
    },
  });
});

import { Technology } from '../models/Technology.js';
import { recordActivity } from '../middlewares/activity.middleware.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (request, response) =>
  sendSuccess(response, {
    data: await Technology.find(request.user.role === 'admin' ? {} : { isActive: true }).sort({
      name: 1,
    }),
  }),
);
export const create = asyncHandler(async (request, response) => {
  const item = await Technology.create({ ...request.body, createdBy: request.user._id });
  await recordActivity(request, 'technology.created', 'Technology', item._id);
  return sendSuccess(response, { statusCode: 201, message: 'Technology created', data: item });
});
export const update = asyncHandler(async (request, response) => {
  const item = await Technology.findByIdAndUpdate(
    request.params.id,
    { ...request.body, updatedBy: request.user._id },
    { new: true, runValidators: true },
  );
  if (!item) throw new ApiError(404, 'Technology not found');
  await recordActivity(request, 'technology.updated', 'Technology', item._id);
  return sendSuccess(response, { message: 'Technology updated', data: item });
});

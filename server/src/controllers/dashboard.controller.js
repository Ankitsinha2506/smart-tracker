import { getDashboard } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const overview = asyncHandler(async (request, response) =>
  sendSuccess(response, {
    data: await getDashboard(
      request.query.from,
      request.query.to,
      request.user,
      request.query.staff,
    ),
  }),
);

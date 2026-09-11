import { USER_STATUSES } from '../constants/domain.constants.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const authenticate = asyncHandler(async (request, _response, next) => {
  const [scheme, token] = request.headers.authorization?.split(' ') || [];
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Access token is invalid or expired');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== USER_STATUSES.ACTIVE)
    throw new ApiError(401, 'User account is unavailable');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw new ApiError(401, 'Password changed; please sign in again');
  }
  request.user = user;
  next();
});

export const authorize =
  (...roles) =>
  (request, _response, next) => {
    if (!roles.includes(request.user.role))
      return next(new ApiError(403, 'You do not have permission for this action'));
    next();
  };

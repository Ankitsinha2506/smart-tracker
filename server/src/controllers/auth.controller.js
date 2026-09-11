import { env } from '../config/env.js';
import { USER_ROLES } from '../constants/domain.constants.js';
import { User } from '../models/User.js';
import * as authService from '../services/auth.service.js';
import { recordActivity } from '../middlewares/activity.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPasswordReset } from '../services/mail.service.js';
import { ApiError } from '../utils/ApiError.js';

const refreshCookieOptions = (rememberMe = true) => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

export const login = asyncHandler(async (request, response) => {
  const result = await authService.login(request.body);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions(result.rememberMe));
  return sendSuccess(response, {
    message: 'Login successful',
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const refresh = asyncHandler(async (request, response) => {
  const result = await authService.refreshSession(request.cookies.refreshToken);
  return sendSuccess(response, { message: 'Session refreshed', data: result });
});

export const logout = asyncHandler(async (request, response) => {
  await authService.revokeSession(request.user.id);
  response.clearCookie('refreshToken', refreshCookieOptions());
  return sendSuccess(response, { message: 'Logout successful' });
});

export const forgotPassword = asyncHandler(async (request, response) => {
  const reset = await authService.createPasswordReset(request.body.email);
  if (reset) await sendPasswordReset(reset.user.email, reset.token);
  return sendSuccess(response, {
    message: 'If the account exists, password reset instructions have been created',
    data: env.nodeEnv === 'development' && reset ? { resetToken: reset.token } : null,
  });
});

export const resetPassword = asyncHandler(async (request, response) => {
  await authService.resetPassword(request.body.token, request.body.password);
  response.clearCookie('refreshToken', refreshCookieOptions());
  return sendSuccess(response, { message: 'Password reset successful' });
});

export const changePassword = asyncHandler(async (request, response) => {
  await authService.changePassword(
    request.user.id,
    request.body.currentPassword,
    request.body.newPassword,
  );
  response.clearCookie('refreshToken', refreshCookieOptions());
  return sendSuccess(response, { message: 'Password changed; please sign in again' });
});

export const me = asyncHandler(async (request, response) =>
  sendSuccess(response, { data: request.user }),
);

export const createUser = asyncHandler(async (request, response) => {
  const { password, ...input } = request.body;
  const user = await User.create({ ...input, passwordHash: password });
  await recordActivity(request, 'user.created', 'User', user._id, { role: user.role });
  return sendSuccess(response, { statusCode: 201, message: 'User created', data: user });
});

export const updateUser = asyncHandler(async (request, response) => {
  const user = await User.findByIdAndUpdate(request.params.id, request.body, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found');
  await recordActivity(request, 'user.updated', 'User', user._id, {
    status: user.status,
    role: user.role,
  });
  return sendSuccess(response, { message: 'User updated', data: user });
});

export const listUsers = asyncHandler(async (request, response) => {
  const users = await User.find({ deletedAt: null })
    .populate('student', 'candidateName personalEmail')
    .sort({ createdAt: -1 });
  return sendSuccess(response, { data: users });
});

export const deleteUser = asyncHandler(async (request, response) => {
  if (request.params.id === request.user.id)
    throw new ApiError(422, 'You cannot delete your own Super Admin account');
  const user = await User.findOneAndUpdate(
    { _id: request.params.id, deletedAt: null },
    { status: 'inactive', deletedAt: new Date(), $unset: { refreshTokenHash: 1 } },
    { new: true },
  );
  if (!user) throw new ApiError(404, 'User not found');
  await recordActivity(request, 'user.deleted', 'User', user._id, { role: user.role });
  return sendSuccess(response, { message: 'User deleted' });
});

export { USER_ROLES };

import { User } from '../models/User.js';
import { USER_STATUSES } from '../constants/domain.constants.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createOpaqueToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

export async function login({ email, password, rememberMe }) {
  const user = await User.findOne({ email }).select(
    '+passwordHash +refreshTokenHash +failedLoginAttempts',
  );
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(429, 'Account temporarily locked after repeated failed attempts');
  }
  const valid = user && (await user.verifyPassword(password));
  if (!valid) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
    }
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status !== USER_STATUSES.ACTIVE) throw new ApiError(403, 'User account is not active');
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, rememberMe);
  user.refreshTokenHash = hashToken(refreshToken);
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  return { user, accessToken, refreshToken, rememberMe };
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'Refresh token is required');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Refresh token is invalid or expired');
  }
  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (
    !user ||
    user.status !== USER_STATUSES.ACTIVE ||
    user.refreshTokenHash !== hashToken(refreshToken)
  ) {
    throw new ApiError(401, 'Refresh session is no longer valid');
  }
  return { user, accessToken: signAccessToken(user) };
}

export async function revokeSession(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

export async function createPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return null;
  const token = createOpaqueToken();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  return { user, token };
}

export async function resetPassword(token, password) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash');
  if (!user) throw new ApiError(400, 'Reset token is invalid or expired');
  user.passwordHash = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = undefined;
  await user.save();
  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.verifyPassword(currentPassword)))
    throw new ApiError(400, 'Current password is incorrect');
  user.passwordHash = newPassword;
  user.refreshTokenHash = undefined;
  await user.save();
}

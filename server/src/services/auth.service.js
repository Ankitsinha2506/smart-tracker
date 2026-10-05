import { randomInt } from 'node:crypto';
import { sendLoginCode } from './mail.service.js';
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
    '+passwordHash +refreshTokenHash +failedLoginAttempts +loginChallenge',
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
  if (user.twoStepEnabled) {
    const challengeToken = createOpaqueToken();
    const code = String(randomInt(100000, 1000000));
    user.loginChallenge = {
      tokenHash: hashToken(challengeToken), codeHash: hashToken(`${challengeToken}:${code}`),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0, rememberMe,
    };
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save({ validateBeforeSave: false });
    try { await sendLoginCode(user.email, code); } catch {
      throw new ApiError(503, 'Unable to send verification email. Please try signing in again later.');
    }
    return { requiresOtp: true, challengeToken };
  }
  return completeLogin(user, rememberMe);
}

async function completeLogin(user, rememberMe) {
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
  user.trustedDevices = [];
  user.loginChallenge = undefined;
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
  user.trustedDevices = [];
  user.loginChallenge = undefined;
  user.passwordHash = newPassword;
  user.refreshTokenHash = undefined;
  await user.save();
}

export async function verifyLoginCode({ challengeToken, code }) {
  // Atomic attempt accounting and consumption prevent concurrent guessing and replay.
  const user = await User.findOneAndUpdate({
    'loginChallenge.tokenHash': hashToken(challengeToken),
    'loginChallenge.expiresAt': { $gt: new Date() },
    'loginChallenge.attempts': { $lt: 5 },
    status: USER_STATUSES.ACTIVE, deletedAt: null,
  }, { $inc: { 'loginChallenge.attempts': 1 } }, { new: true })
    .select('+loginChallenge');
  if (!user || user.loginChallenge.codeHash !== hashToken(`${challengeToken}:${code}`)) {
    throw new ApiError(400, 'Invalid or expired code. After five attempts, sign in again.');
  }
  const consumed = await User.updateOne({
    _id: user._id, 'loginChallenge.tokenHash': hashToken(challengeToken),
  }, { $unset: { loginChallenge: 1 } });
  if (!consumed.modifiedCount) throw new ApiError(400, 'Code already used. Sign in again.');
  const rememberMe = user.loginChallenge.rememberMe;
  user.trustedDevices = [];
  user.loginChallenge = undefined;
  return completeLogin(user, rememberMe);
}

export async function setTwoStep(userId, { enabled, currentPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !await user.verifyPassword(currentPassword)) throw new ApiError(400, 'Current password is incorrect');
  user.twoStepEnabled = enabled;
  user.trustedDevices = [];
  user.loginChallenge = undefined;
  await user.save();
  return user;
}

export async function createUserAccount({ password, ...input }) {
  const user = new User({ ...input, passwordHash: password });
  await user.validate();
  // Older versions retained deleted accounts, which still occupy unique indexes.
  // Reclaim only explicitly deleted accounts matching this new account.
  const matches = [{ email: user.email }];
  if (user.student) matches.push({ student: user.student });
  await User.deleteMany({ deletedAt: { $type: 'date' }, $or: matches });
  await user.save();
  return user;
}

export async function permanentlyDeleteUser(userId, actorId) {
  if (String(userId) === String(actorId)) {
    throw new ApiError(422, 'You cannot delete your own Super Admin account');
  }
  const user = await User.findOneAndDelete({ _id: userId });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

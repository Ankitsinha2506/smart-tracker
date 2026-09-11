import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const createOpaqueToken = () => crypto.randomBytes(32).toString('hex');

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

export function signRefreshToken(user, rememberMe = false) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: rememberMe ? env.jwtRefreshExpiresIn : '1d',
  });
}

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

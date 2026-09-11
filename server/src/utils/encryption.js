import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY = Buffer.from(env.encryptionKey, 'hex');

export function encryptSecret(plainText) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new TypeError('Secret must be a non-empty string');
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return {
    value: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(payload) {
  if (!payload?.value || !payload?.iv || !payload?.authTag) {
    throw new TypeError('Encrypted secret payload is incomplete');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.value, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

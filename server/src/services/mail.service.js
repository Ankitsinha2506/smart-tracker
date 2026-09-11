import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function sendPasswordReset(email, token) {
  if (!env.smtpHost) {
    logger.warn('SMTP is not configured; reset email was not sent', { email });
    return false;
  }
  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    ...(env.smtpUser && { auth: { user: env.smtpUser, pass: env.smtpPassword } }),
  });
  const url = new URL(env.frontendResetUrl);
  url.searchParams.set('token', token);
  await transport.sendMail({
    from: env.mailFrom,
    to: email,
    subject: 'Reset your SmartApply password',
    text: `Reset your SmartApply password using this link (valid for 15 minutes): ${url}`,
    html: `<p>Reset your SmartApply password using the link below. It is valid for 15 minutes.</p><p><a href="${url}">Reset password</a></p>`,
  });
  return true;
}

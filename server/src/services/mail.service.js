import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { loginCodeEmail, passwordResetEmail } from '../utils/emailTemplates.js';

function sendMail(email, content) {
  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    ...(env.smtpUser && { auth: { user: env.smtpUser, pass: env.smtpPassword } }),
  });
  return transport.sendMail({
    from: { name: env.mailFromName, address: env.mailFrom },
    to: email,
    ...content,
  });
}

export async function sendPasswordReset(email, token) {
  if (!env.smtpHost) {
    logger.warn('SMTP is not configured; reset email was not sent', { email });
    return false;
  }
  const url = new URL(env.frontendResetUrl);
  url.searchParams.set('token', token);
  await sendMail(email, passwordResetEmail(url.toString()));
  return true;
}

export async function sendLoginCode(email, code) {
  if (!env.smtpHost) throw new Error('SMTP is not configured');
  await sendMail(email, loginCodeEmail(code));
}

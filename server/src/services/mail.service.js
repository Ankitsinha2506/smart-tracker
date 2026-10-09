import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { loginCodeEmail, passwordResetEmail } from '../utils/emailTemplates.js';

async function sendMail(email, content) {
  const provider = env.resendApiKey ? 'resend' : 'smtp';
  try {
    if (env.resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `"${env.mailFromName.replace(/["\\\r\n]/g, '')}" <${env.mailFrom}>`,
          to: [email],
          ...content,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const error = new Error('Email provider rejected the request');
        error.status = response.status;
        throw error;
      }
      return;
    }
    if (!env.smtpHost) throw new Error('Email delivery is not configured');
    const transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      ...(env.smtpUser && { auth: { user: env.smtpUser, pass: env.smtpPassword } }),
    });
    return await transport.sendMail({
      from: { name: env.mailFromName, address: env.mailFrom },
      to: email,
      ...content,
    });
  } catch (error) {
    // Do not log provider response bodies, credentials, recipients, or email content.
    logger.error('Email delivery failed', {
      provider,
      code: error.code,
      status: error.status,
      responseCode: error.responseCode,
      errorType: error.name,
    });
    throw error;
  }
}

export async function sendPasswordReset(email, token) {
  if (!env.smtpHost && !env.resendApiKey) {
    logger.warn('Email delivery is not configured; reset email was not sent');
    return false;
  }
  const url = new URL(env.frontendResetUrl);
  url.searchParams.set('token', token);
  await sendMail(email, passwordResetEmail(url.toString()));
  return true;
}

export async function sendLoginCode(email, code) {
  await sendMail(email, loginCodeEmail(code));
}

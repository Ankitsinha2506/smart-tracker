import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { loginCodeEmail, passwordResetEmail } from '../utils/emailTemplates.js';

function deliveryHint(error, provider) {
  if (provider === 'smtp') {
    if (error.code === 'EAUTH')
      return 'Check SMTP credentials and provider authentication requirements.';
    if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET'].includes(error.code)) {
      return 'Check outbound SMTP access. Render free services block ports 25, 465, and 587; configure RESEND_API_KEY on the backend or use hosting that permits SMTP.';
    }
    return 'Check backend SMTP configuration and sender authorization.';
  }
  if (error.deliveryReason === 'unverified_sender')
    return 'Verify the MAIL_FROM domain in Resend and use an address on that verified domain.';
  if (error.deliveryReason === 'testing_sender')
    return 'Resend testing senders cannot email general users. Verify your own domain and update MAIL_FROM.';
  if (error.status === 401)
    return 'Set a valid RESEND_API_KEY in the backend hosting environment and restart the service.';
  if (error.status === 403)
    return 'Check Resend API key permissions, account status, and sender-domain verification.';
  if (error.status === 429) return 'Check Resend rate limits and sending quota.';
  return 'Check Resend delivery logs and backend HTTPS connectivity.';
}

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
        // Classify known messages without logging the response, which may contain personal data.
        const body = await response.json().catch(() => null);
        const message = typeof body?.message === 'string' ? body.message : '';
        if (/only send testing emails/i.test(message)) error.deliveryReason = 'testing_sender';
        else if (/domain.*not verified/i.test(message)) error.deliveryReason = 'unverified_sender';
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
      reason: error.deliveryReason,
      action: deliveryHint(error, provider),
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

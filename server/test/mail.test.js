import assert from 'node:assert/strict';
import { before, test } from 'node:test';

let mail;
before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/smartapply-test',
    CLIENT_URL: 'https://example.com',
    JWT_ACCESS_SECRET: 'test-access-secret-with-at-least-32-characters',
    JWT_REFRESH_SECRET: 'test-refresh-secret-with-at-least-32-characters',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    RESEND_API_KEY: 're_test_key',
    SMTP_HOST: '',
    MAIL_FROM: 'security@example.com',
    FRONTEND_RESET_URL: 'https://example.com/reset-password',
  });
  mail = await import('../src/services/mail.service.js');
});

test('production OTP and reset emails use HTTPS without an SMTP host', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true };
  });
  await mail.sendLoginCode('user@example.com', '123456');
  assert.equal(await mail.sendPasswordReset('user@example.com', 'reset-test-token'), true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer re_test_key');
  assert.deepEqual(requests[0].body.to, ['user@example.com']);
  assert.match(requests[0].body.from, /<security@example.com>/);
  assert.match(requests[0].body.text, /123456/);
  assert.match(requests[1].body.text, /https:\/\/example.com\/reset-password\?token=reset-test-token/);
  assert.ok(requests[0].options.signal instanceof AbortSignal);
});

test('provider rejection and network failure do not report successful delivery', async (t) => {
  const { logger } = await import('../src/config/logger.js');
  const entries = [];
  t.mock.method(logger, 'error', (message, details) => entries.push({ message, details }));
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403 }));
  await assert.rejects(mail.sendLoginCode('user@example.com', '123456'), /rejected/);
  assert.equal(entries[0].details.status, 403);
  assert.equal(entries[0].details.provider, 'resend');
  assert.doesNotMatch(JSON.stringify(entries), /123456|re_test_key|user@example.com/);
  fetchMock.mock.mockImplementation(async () => { throw new Error('Network unavailable'); });
  await assert.rejects(mail.sendPasswordReset('user@example.com', 'reset-test-token'), /Network unavailable/);
});

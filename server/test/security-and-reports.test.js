import assert from 'node:assert/strict';
import { before, test } from 'node:test';

before(() => {
  process.env.NODE_ENV = 'test';
  process.env.RESEND_API_KEY = '';
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/smartapply-test';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-characters';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

test('access and refresh tokens are type-isolated', async () => {
  const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } =
    await import('../src/utils/tokens.js');
  const user = { id: '507f1f77bcf86cd799439011', role: 'admin' };
  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);
  assert.equal(verifyAccessToken(access).type, 'access');
  assert.equal(verifyRefreshToken(refresh).type, 'refresh');
  assert.throws(() => verifyAccessToken(refresh));
});

test('MongoDB operator sanitization removes nested operators and dotted keys', async () => {
  const { sanitizeMongoOperators } = await import('../src/middlewares/sanitize.middleware.js');
  const request = {
    body: { profile: { $where: 'unsafe', name: 'safe' } },
    params: {},
    query: { 'name.$gt': '', filter: { $ne: null, city: 'Pune' } },
  };
  await new Promise((resolve) => sanitizeMongoOperators(request, {}, resolve));
  assert.deepEqual(request.body, { profile: { name: 'safe' } });
  assert.deepEqual(request.query, { filter: { city: 'Pune' } });
});

const reportRows = [
  {
    candidateName: 'Example Student',
    email: 'student@example.com',
    technology: 'MERN',
    trainer: 'Trainer',
    batch: '2026-A',
    membership: 'free',
    applications: 5,
    activeDays: 1,
  },
];

test('spreadsheet exports neutralize formula-like cells', async () => {
  const { renderReport } = await import('../src/services/report.service.js');
  const csv = await renderReport(
    'csv',
    [{ ...reportRows[0], candidateName: '=IMPORTXML("bad")' }],
    'Test',
  );
  assert.match(csv.toString(), /'=IMPORTXML/);
});

test('CSV, XLSX, and PDF renderers produce recognizable files', async () => {
  const { renderReport } = await import('../src/services/report.service.js');
  const csv = await renderReport('csv', reportRows, 'Test');
  const xlsx = await renderReport('xlsx', reportRows, 'Test');
  const pdf = await renderReport('pdf', reportRows, 'Test');
  assert.match(csv.toString(), /Example Student/);
  assert.equal(xlsx.subarray(0, 2).toString(), 'PK');
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
});

test('staff defaults to verification, including existing accounts, and secrets are hidden', async () => {
  const { User } = await import('../src/models/User.js');
  for (const user of [new User({ role: 'staff' }), User.hydrate({ role: 'staff' })]) {
    assert.equal(user.twoStepEnabled, true);
    user.loginChallenge = { tokenHash: 'secret', codeHash: 'secret' };
    user.trustedDevices = [{ tokenHash: 'secret' }];
    assert.equal(user.toJSON().loginChallenge, undefined);
    assert.equal(user.toJSON().trustedDevices, undefined);
  }
  assert.equal(User.hydrate({ role: 'staff', twoStepEnabled: false }).twoStepEnabled, false);
});

test('OTP verification rejects wrong codes without issuing a session', async (t) => {
  const { User } = await import('../src/models/User.js');
  const { verifyLoginCode } = await import('../src/services/auth.service.js');
  t.mock.method(User, 'findOneAndUpdate', (filter, update) => {
    assert.equal(filter['loginChallenge.attempts'].$lt, 5);
    assert.ok(filter['loginChallenge.expiresAt'].$gt instanceof Date);
    assert.equal(update.$inc['loginChallenge.attempts'], 1);
    return { select: async () => ({ loginChallenge: { codeHash: 'wrong' } }) };
  });
  await assert.rejects(verifyLoginCode({ challengeToken: 'a'.repeat(64), code: '123456' }), /Invalid or expired/);
});

test('OTP verification refuses replay after atomic challenge consumption', async (t) => {
  const { User } = await import('../src/models/User.js');
  const { hashToken } = await import('../src/utils/tokens.js');
  const { verifyLoginCode } = await import('../src/services/auth.service.js');
  const challengeToken = 'a'.repeat(64);
  t.mock.method(User, 'findOneAndUpdate', () => ({ select: async () => ({
    _id: '507f1f77bcf86cd799439011', loginChallenge: { codeHash: hashToken(`${challengeToken}:123456`) },
  }) }));
  t.mock.method(User, 'updateOne', async () => ({ modifiedCount: 0 }));
  await assert.rejects(verifyLoginCode({ challengeToken, code: '123456' }), /already used/);
});

test('every login requires OTP even with a previously trusted browser', async (t) => {
  const { User } = await import('../src/models/User.js');
  const { hashToken } = await import('../src/utils/tokens.js');
  const { login } = await import('../src/services/auth.service.js');
  const { default: nodemailer } = await import('nodemailer');
  const sent = [];
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async (message) => { sent.push(message); } }));
  const user = {
    id: '507f1f77bcf86cd799439011', email: 'staff@example.com', role: 'staff', status: 'active', twoStepEnabled: true,
    failedLoginAttempts: 0,
    trustedDevices: [{ tokenHash: hashToken('trusted'), expiresAt: new Date(Date.now() + 60000) }],
    verifyPassword: async (password) => password === 'correct', save: async () => {},
  };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  await assert.rejects(login({ email: 'staff@example.com', password: 'wrong' }, 'trusted'), /Invalid email or password/);
  const result = await login({ email: 'staff@example.com', password: 'correct' }, 'trusted');
  assert.equal(result.accessToken, undefined);
  assert.equal(result.requiresOtp, true);
  assert.equal(sent.length, 1);
  const second = await login({ email: 'staff@example.com', password: 'correct' }, 'trusted');
  assert.equal(second.requiresOtp, true);
  assert.notEqual(second.challengeToken, result.challengeToken);
  assert.equal(sent.length, 2);
  user.twoStepEnabled = false;
  const disabled = await login({ email: 'staff@example.com', password: 'correct' });
  assert.ok(disabled.accessToken);
  assert.equal(sent.length, 2);
});

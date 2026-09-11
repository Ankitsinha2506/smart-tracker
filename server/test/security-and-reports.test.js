import assert from 'node:assert/strict';
import { before, test } from 'node:test';

before(() => {
  process.env.NODE_ENV = 'test';
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

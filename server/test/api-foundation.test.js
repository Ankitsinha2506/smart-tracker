import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import request from 'supertest';

before(() => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/smartapply-test';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.CLIENT_ADDITIONAL_ORIGINS = 'https://smartapply.nexusctc.com';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-characters';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

test('login rejects malformed input using the standard validation envelope', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
  assert.equal(response.status, 422);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Validation failed');
  assert.ok(response.body.errors.some((error) => error.field === 'email'));
  assert.ok(response.body.errors.some((error) => error.field === 'password'));
});

test('student creation is protected', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app).post('/api/v1/students').send({});
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Authentication required');
});

test('student owners resolves the static route instead of validating owners as an ID', async (t) => {
  const { app } = await import('../src/app.js');
  const { User } = await import('../src/models/User.js');
  const { Student } = await import('../src/models/Student.js');
  const { signAccessToken } = await import('../src/utils/tokens.js');
  const admin = { id: '507f1f77bcf86cd799439011', role: 'admin', status: 'active' };
  const owners = [{ _id: admin.id, name: 'Admin', role: 'admin', status: 'active' }];
  t.mock.method(User, 'findById', async () => admin);
  t.mock.method(Student, 'distinct', async () => [admin.id]);
  t.mock.method(User, 'find', () => ({
    select: () => ({ sort: () => ({ lean: async () => owners }) }),
  }));
  const response = await request(app)
    .get('/api/v1/students/owners')
    .set('Authorization', `Bearer ${signAccessToken(admin)}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, owners);
});

test('student owners rejects staff access', async (t) => {
  const { app } = await import('../src/app.js');
  const { User } = await import('../src/models/User.js');
  const { signAccessToken } = await import('../src/utils/tokens.js');
  const staff = { id: '507f1f77bcf86cd799439011', role: 'staff', status: 'active' };
  t.mock.method(User, 'findById', async () => staff);
  const response = await request(app)
    .get('/api/v1/students/owners')
    .set('Authorization', `Bearer ${signAccessToken(staff)}`);
  assert.equal(response.status, 403);
});

test('student Naukri credentials are protected', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app).get(
    '/api/v1/students/507f1f77bcf86cd799439011/naukri-credential',
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Authentication required');
});

test('unsafe requests from an untrusted browser origin are rejected', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('Origin', 'https://attacker.example')
    .send({ email: 'admin@example.com', password: 'Admin123!' });
  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Request origin is not trusted');
});

test('login preflight permits the configured browser origin', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app)
    .options('/api/v1/auth/login')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type');
  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
  assert.match(response.headers['access-control-allow-methods'], /POST/);
  assert.match(response.headers['access-control-allow-headers'], /Content-Type/i);
});

test('responses include a traceable request ID', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app).get('/api/v1/health').set('X-Request-Id', 'phase5-test');
  assert.equal(response.headers['x-request-id'], 'phase5-test');
});

test('unknown query keys are rejected before controller execution', async () => {
  const { dashboardQuerySchema } = await import('../src/validators/dashboard.validator.js');
  const { error } = dashboardQuerySchema.validate({ unexpected: 'value' }, { allowUnknown: false });
  assert.ok(error);
});

test('only admins can update another user’s two-step setting and pending codes are cleared', async (t) => {
  const { app } = await import('../src/app.js');
  const { User } = await import('../src/models/User.js');
  const { ActivityLog } = await import('../src/models/ActivityLog.js');
  const { signAccessToken } = await import('../src/utils/tokens.js');
  const actor = { id: '507f1f77bcf86cd799439011', role: 'admin', status: 'active' };
  const target = '507f1f77bcf86cd799439012';
  t.mock.method(User, 'findById', async () => actor);
  t.mock.method(ActivityLog, 'create', async () => ({}));
  const updates = [];
  t.mock.method(User, 'findByIdAndUpdate', async (id, update) => {
    updates.push({ id, update });
    return { _id: id, role: 'staff', status: 'active', twoStepEnabled: update.$set.twoStepEnabled };
  });
  for (const enabled of [false, true]) {
    const response = await request(app).patch(`/api/v1/auth/users/${target}`)
      .set('Authorization', `Bearer ${signAccessToken(actor)}`).send({ twoStepEnabled: enabled });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.twoStepEnabled, enabled);
    assert.deepEqual(updates.at(-1), { id: target, update: {
      $set: { twoStepEnabled: enabled, trustedDevices: [] }, $unset: { loginChallenge: 1 },
    } });
  }
  const invalid = await request(app).patch(`/api/v1/auth/users/${target}`)
    .set('Authorization', `Bearer ${signAccessToken(actor)}`).send({ twoStepEnabled: 'invalid' });
  assert.equal(invalid.status, 422);
  actor.role = 'staff';
  const forbidden = await request(app).patch(`/api/v1/auth/users/${target}`)
    .set('Authorization', `Bearer ${signAccessToken(actor)}`).send({ twoStepEnabled: false });
  assert.equal(forbidden.status, 403);
  assert.equal(updates.length, 2);
});


test('additional custom domain allows CORS and passes trusted-origin validation', async () => {
  const { app } = await import('../src/app.js');
  const origin = 'https://smartapply.nexusctc.com';
  const preflight = await request(app).options('/api/v1/auth/login')
    .set('Origin', origin).set('Access-Control-Request-Method', 'POST');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], origin);
  assert.equal(preflight.headers['access-control-allow-credentials'], 'true');
  const login = await request(app).post('/api/v1/auth/login').set('Origin', origin).send({});
  assert.equal(login.status, 422, 'allowed origin reaches input validation');
  const rejected = await request(app).post('/api/v1/auth/login')
    .set('Origin', 'https://smartapply.nexusctc.com.attacker.example').send({});
  assert.equal(rejected.status, 403);
});

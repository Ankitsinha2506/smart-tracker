import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import request from 'supertest';

before(() => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/smartapply-test';
  process.env.CLIENT_URL = 'http://localhost:5173';
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

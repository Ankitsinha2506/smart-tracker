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

test('GET /api/v1/health returns a successful response', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app).get('/api/v1/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test('unknown routes use the standard error envelope', async () => {
  const { app } = await import('../src/app.js');
  const response = await request(app).get('/api/v1/missing');
  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

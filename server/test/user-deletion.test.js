import assert from 'node:assert/strict';
import { before, test } from 'node:test';

before(() => {
  Object.assign(process.env, {
    NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1/test',
    CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32), ENCRYPTION_KEY: 'a'.repeat(64),
  });
});

test('deleting an account removes its database document and prevents self-deletion', async (t) => {
  const { User } = await import('../src/models/User.js');
  const { permanentlyDeleteUser } = await import('../src/services/auth.service.js');
  const calls = [];
  t.mock.method(User, 'findOneAndDelete', async (filter) => {
    calls.push(filter);
    return filter._id === 'staff-id' ? { _id: 'staff-id', role: 'staff' } : null;
  });
  await assert.rejects(permanentlyDeleteUser('admin-id', 'admin-id'), /own Super Admin/);
  assert.equal(calls.length, 0);
  assert.equal((await permanentlyDeleteUser('staff-id', 'admin-id')).role, 'staff');
  assert.deepEqual(calls, [{ _id: 'staff-id' }]);
  await assert.rejects(permanentlyDeleteUser('missing', 'admin-id'), /User not found/);
});

test('recreating an account reclaims only matching legacy-deleted records', async (t) => {
  const { User } = await import('../src/models/User.js');
  const { createUserAccount } = await import('../src/services/auth.service.js');
  const calls = [];
  t.mock.method(User, 'deleteMany', async (filter) => { calls.push(filter); });
  t.mock.method(User.prototype, 'save', async function () { return this; });
  const input = { name: 'Test Staff', email: 'STAFF@example.com', password: 'Password123', role: 'staff' };
  const user = await createUserAccount(input);
  assert.equal(user.email, 'staff@example.com');
  assert.deepEqual(calls, [{ deletedAt: { $type: 'date' }, $or: [{ email: 'staff@example.com' }] }]);
  await assert.rejects(createUserAccount({ ...input, name: '' }), { name: 'ValidationError' });
  assert.equal(calls.length, 1, 'invalid input must not remove any records');
});

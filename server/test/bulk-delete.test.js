import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { bulkDeleteStudentsSchema } from '../src/validators/student.validator.js';
before(() => {
  Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1/test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32), ENCRYPTION_KEY: 'a'.repeat(64) });
});
test('bulk delete requires explicit scope, IDs or all confirmation', () => {
  for (const body of [{}, { scope: 'selected', ids: [] }, { scope: 'all' }, { scope: 'all', confirmation: 'DELETE ALL', ids: ['a'.repeat(24)] }]) {
    assert.ok(bulkDeleteStudentsSchema.validate(body).error);
  }
  assert.equal(bulkDeleteStudentsSchema.validate({ scope: 'selected', ids: ['a'.repeat(24)] }).error, undefined);
  assert.equal(bulkDeleteStudentsSchema.validate({ scope: 'all', confirmation: 'DELETE ALL' }).error, undefined);
});
test('bulk deletion scopes staff and soft-deletes without removing history', async t => {
  const { Student } = await import('../src/models/Student.js');
  const { bulkDeleteStudents } = await import('../src/services/student.service.js');
  const calls = [];
  t.mock.method(Student, 'updateMany', async (filter, update) => { calls.push({ filter, update }); return { modifiedCount: 10 }; });
  const actor = { role: 'staff', _id: 'staff-id' };
  assert.deepEqual(await bulkDeleteStudents({ scope: 'all' }, actor), { deletedCount: 10 });
  assert.deepEqual(calls[0].filter, { deletedAt: null, createdBy: 'staff-id' });
  assert.equal(calls[0].update.$set.status, 'inactive');
  assert.ok(calls[0].update.$set.deletedAt instanceof Date);
  await bulkDeleteStudents({ scope: 'selected', ids: ['a'.repeat(24)] }, actor);
  assert.deepEqual(calls[1].filter._id, { $in: ['a'.repeat(24)] });
  await bulkDeleteStudents({ scope: 'staff', staff: 'owner-id' }, { role: 'admin', _id: 'admin-id' });
  assert.equal(calls[2].filter.createdBy, 'owner-id');
  await assert.rejects(bulkDeleteStudents({ scope: 'staff', staff: 'other-id' }, actor), /Not authorized/);
  assert.ok(bulkDeleteStudentsSchema.validate({ scope: 'staff', confirmation: 'DELETE ALL' }).error);
  assert.equal(bulkDeleteStudentsSchema.validate({ scope: 'staff', staff: 'a'.repeat(24), confirmation: 'DELETE ALL' }).error, undefined);
  await assert.rejects(bulkDeleteStudents({ scope: 'all' }, { role: 'student' }), /Not authorized/);
});

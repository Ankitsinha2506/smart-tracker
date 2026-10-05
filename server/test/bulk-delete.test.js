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
test('permanent deletion includes old deleted candidates and respects staff scope', async t => {
  const { default: mongoose } = await import('mongoose');
  const { Student } = await import('../src/models/Student.js');
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const { User } = await import('../src/models/User.js');
  const { bulkDeleteStudents, deleteStudent } = await import('../src/services/student.service.js');
  const scopes = [], histories = [], accounts = [], deletions = [];
  let ended = 0;
  const session = { withTransaction: async callback => callback(), endSession: async () => { ended++; } };
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(Student, 'distinct', (field, filter) => {
    scopes.push(filter);
    return { session: async () => ['candidate-id'] };
  });
  t.mock.method(ApplyHistory, 'deleteMany', async filter => { histories.push(filter); });
  t.mock.method(User, 'deleteMany', async filter => { accounts.push(filter); });
  t.mock.method(Student, 'deleteMany', async filter => { deletions.push(filter); return { deletedCount: 1 }; });
  const actor = { role: 'staff', _id: 'staff-id' };
  assert.deepEqual(await bulkDeleteStudents({ scope: 'all' }, actor), { deletedCount: 1 });
  assert.deepEqual(scopes[0], { createdBy: 'staff-id' });
  assert.deepEqual(histories[0], { student: { $in: ['candidate-id'] } });
  assert.deepEqual(accounts[0], { student: { $in: ['candidate-id'] }, role: 'student' });
  assert.deepEqual(deletions[0], { _id: { $in: ['candidate-id'] } });
  await bulkDeleteStudents({ scope: 'selected', ids: ['a'.repeat(24)] }, actor);
  assert.deepEqual(scopes[1], { createdBy: 'staff-id', _id: { $in: ['a'.repeat(24)] } });
  await bulkDeleteStudents({ scope: 'staff', staff: 'owner-id' }, { role: 'admin' });
  assert.deepEqual(scopes[2], { createdBy: 'owner-id' });
  await bulkDeleteStudents({ scope: 'all' }, { role: 'admin' });
  assert.deepEqual(scopes[3], {});
  assert.deepEqual(histories[3], {}, 'admin delete all also clears orphaned history');
  await assert.rejects(bulkDeleteStudents({ scope: 'staff', staff: 'other' }, actor), /Not authorized/);
  await assert.rejects(bulkDeleteStudents({ scope: 'all' }, { role: 'student' }), /Not authorized/);
  await deleteStudent('candidate-id');
  assert.deepEqual(scopes[4], { _id: 'candidate-id' });
  assert.equal(ended, 5);
  t.mock.method(ApplyHistory, 'deleteMany', async () => { throw new Error('database failure'); });
  await assert.rejects(deleteStudent('candidate-id'), /database failure/);
  assert.equal(deletions.length, 5, 'candidate removal does not proceed after history deletion fails');
  assert.equal(ended, 6);
});

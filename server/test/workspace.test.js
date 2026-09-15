import assert from 'node:assert/strict';
import { before, test } from 'node:test';

before(() => {
  Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1/test', CLIENT_URL: 'http://localhost:5173', JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32), ENCRYPTION_KEY: 'a'.repeat(64) });
});

test('workspace restricts staff and candidates to their own records', async () => {
  const { workspaceScope } = await import('../src/services/workspace.service.js');
  assert.deepEqual(workspaceScope({ role: 'admin' }), { deletedAt: null });
  assert.deepEqual(workspaceScope({ role: 'staff', _id: 'staff-id' }), { deletedAt: null, createdBy: 'staff-id' });
  assert.deepEqual(workspaceScope({ role: 'student', student: 'candidate-id' }), { deletedAt: null, _id: 'candidate-id' });
  assert.throws(() => workspaceScope({ role: 'student' }), /No candidate profile/);
  assert.throws(() => workspaceScope({ role: 'unknown' }), /No candidate profile/);
});

test('workspace treats a recorded zero-count update as complete and fills missing chart days', async t => {
  const { getWorkspace } = await import('../src/services/workspace.service.js');
  const { Student } = await import('../src/models/Student.js');
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const { businessDate } = await import('../src/utils/date.js');
  const query = rows => ({ select: () => query(rows), populate: () => query(rows), sort: () => query(rows), limit: () => query(rows), lean: async () => rows });
  t.mock.method(Student, 'distinct', async (_key, scope) => {
    assert.equal(scope.createdBy, 'staff-id');
    return ['candidate-a', 'candidate-b'];
  });
  t.mock.method(ApplyHistory, 'distinct', async (_key, scope) => {
    assert.deepEqual(scope.student.$in, ['candidate-a', 'candidate-b']);
    return ['candidate-a'];
  });
  t.mock.method(Student, 'aggregate', async () => [{ total: 2, active: 2, placed: 0, applications: 10 }]);
  t.mock.method(Student, 'countDocuments', async scope => {
    assert.equal(scope.createdBy, 'staff-id');
    assert.deepEqual(scope._id.$nin, ['candidate-a']);
    return 1;
  });
  t.mock.method(Student, 'find', () => query([{ _id: 'candidate-b' }]));
  t.mock.method(ApplyHistory, 'aggregate', async () => [{ _id: businessDate(), applications: 0 }]);
  t.mock.method(ApplyHistory, 'find', () => query([]));
  const result = await getWorkspace({ role: 'staff', _id: 'staff-id' });
  assert.equal(result.cards.updated, 1);
  assert.equal(result.cards.pending, 1);
  assert.equal(result.cards.todayApplications, 0);
  assert.equal(result.dailyTrend.length, 30);
  assert.ok(result.dailyTrend.every(row => row.applications === 0));
  assert.equal(result.attention[0]._id, 'candidate-b');
});

import assert from 'node:assert/strict';
import { before, test } from 'node:test';

before(() => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1/test',
    CLIENT_URL: 'http://localhost:5173',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    ENCRYPTION_KEY: 'a'.repeat(64),
  });
});
const chain = (rows) => {
  const query = {
    select: () => query,
    populate: () => query,
    sort: () => query,
    limit: () => query,
    lean: async () => rows,
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
};

test('dashboard filters retain staff ownership across candidate and application aggregates', async (t) => {
  const { getDashboard } = await import('../src/services/dashboard.service.js');
  const { Student } = await import('../src/models/Student.js');
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const { User } = await import('../src/models/User.js');
  const actorId = '507f1f77bcf86cd799439001';
  const technologyId = '507f1f77bcf86cd799439021';
  const candidates = ['507f1f77bcf86cd799439011'];
  const studentScopes = [],
    historyScopes = [];
  t.mock.method(Student, 'find', (scope) => ({
    distinct: async () => {
      studentScopes.push(scope);
      return candidates;
    },
  }));
  t.mock.method(Student, 'aggregate', async (pipeline) => {
    studentScopes.push(pipeline[0].$match);
    return [];
  });
  t.mock.method(Student, 'countDocuments', async (scope) => {
    studentScopes.push(scope);
    return 0;
  });
  t.mock.method(ApplyHistory, 'aggregate', async (pipeline) => {
    historyScopes.push(pipeline[0].$match);
    return [];
  });
  t.mock.method(ApplyHistory, 'find', (scope) => {
    historyScopes.push(scope);
    return chain([]);
  });
  t.mock.method(ApplyHistory, 'distinct', async (_field, scope) => {
    historyScopes.push(scope);
    return [];
  });
  t.mock.method(User, 'countDocuments', async (scope) => {
    assert.equal(scope._id, actorId);
    return 1;
  });
  t.mock.method(User, 'findById', () => chain(null));
  const data = await getDashboard(
    '2026-10-01',
    '2026-10-07',
    { role: 'staff', _id: actorId },
    '507f1f77bcf86cd799439099',
    { technology: technologyId, status: 'active', membershipType: 'paid' },
  );
  for (const scope of studentScopes) {
    assert.equal(scope.createdBy, actorId);
    assert.equal(scope.technology.toString(), technologyId);
    assert.equal(scope.status, 'active');
    assert.equal(scope.membershipType, 'paid');
    assert.equal(scope.deletedAt, null);
  }
  for (const scope of historyScopes) {
    assert.equal(scope.recordedBy, actorId);
    assert.deepEqual(scope.student.$in, candidates);
  }
  assert.equal(data.charts.dailyTrend.length, 7);
  assert.ok(data.charts.dailyTrend.every((row) => row.applications === 0 && row.candidates === 0));
  assert.equal(data.cards.totalRecruiters, 1);
  assert.equal(data.comparisons.registrations.current, 0);
});

test('all-time dashboard starts at the first scoped application instead of a 30-day default', async (t) => {
  const { getDashboard } = await import('../src/services/dashboard.service.js');
  const { Student } = await import('../src/models/Student.js');
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const { User } = await import('../src/models/User.js');
  const { businessDate, addUtcDays } = await import('../src/utils/date.js');
  const oldest = addUtcDays(businessDate(), -60);
  t.mock.method(Student, 'find', () => ({ distinct: async () => [] }));
  t.mock.method(Student, 'aggregate', async () => []);
  t.mock.method(Student, 'countDocuments', async () => 0);
  t.mock.method(Student, 'findOne', () => chain(null));
  t.mock.method(ApplyHistory, 'findOne', (scope) => {
    assert.deepEqual(scope.student.$in, []);
    return chain({ applicationDate: oldest });
  });
  t.mock.method(ApplyHistory, 'aggregate', async () => []);
  t.mock.method(ApplyHistory, 'find', () => chain([]));
  t.mock.method(ApplyHistory, 'distinct', async () => []);
  t.mock.method(User, 'countDocuments', async () => 0);
  t.mock.method(User, 'find', () => chain([]));
  const data = await getDashboard(undefined, undefined, { role: 'admin' }, undefined, {
    allTime: true,
  });
  assert.equal(data.range.from.toISOString(), oldest.toISOString());
  assert.equal(data.charts.dailyTrend.length, 61);
});

test('dashboard query validates supported dimensions and rejects untracked ATS fields', async () => {
  const { dashboardQuerySchema } = await import('../src/validators/dashboard.validator.js');
  assert.equal(
    dashboardQuerySchema.validate({ allTime: 'true', status: 'placed', membershipType: 'paid' })
      .error,
    undefined,
  );
  assert.ok(dashboardQuerySchema.validate({ status: 'interview' }).error);
  assert.ok(dashboardQuerySchema.validate({ company: 'Example' }).error);
  assert.ok(dashboardQuerySchema.validate({ from: '2026-10-07', to: '2026-10-01' }).error);
});

test('recruiter performance groups the team without per-recruiter database queries', async (t) => {
  const { getDashboard } = await import('../src/services/dashboard.service.js');
  const { Student } = await import('../src/models/Student.js');
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const { User } = await import('../src/models/User.js');
  const staff = [
    { _id: 'staff-a', name: 'A' },
    { _id: 'staff-b', name: 'B' },
  ];
  let teamStudentQueries = 0,
    teamHistoryQueries = 0;
  t.mock.method(Student, 'find', () => ({ distinct: async () => ['candidate-a'] }));
  t.mock.method(Student, 'aggregate', async (pipeline) => {
    if (pipeline[1]?.$group?._id === '$createdBy') {
      teamStudentQueries += 1;
      return [{ _id: 'staff-a', count: 3, overall: 90, placed: 1 }];
    }
    return [];
  });
  t.mock.method(Student, 'countDocuments', async () => 0);
  t.mock.method(ApplyHistory, 'aggregate', async (pipeline) => {
    if (pipeline[1]?.$group?._id === '$recordedBy') {
      teamHistoryQueries += 1;
      assert.deepEqual(pipeline[0].$match.student.$in, ['candidate-a']);
      return [{ _id: 'staff-a', total: 25 }];
    }
    return [];
  });
  t.mock.method(ApplyHistory, 'find', () => chain([]));
  t.mock.method(ApplyHistory, 'distinct', async () => []);
  t.mock.method(User, 'find', () => chain(staff));
  t.mock.method(User, 'countDocuments', async () => 2);
  const data = await getDashboard('2026-10-01', '2026-10-07', { role: 'admin' });
  assert.equal(teamStudentQueries, 1);
  assert.equal(teamHistoryQueries, 2);
  assert.equal(data.charts.staffPerformance[0].placedStudents, 1);
  assert.equal(data.charts.staffPerformance[0].averagePerStudent, 30);
  assert.equal(data.charts.staffPerformance[1].applications, 0);
});

import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import mongoose from 'mongoose';

before(() => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/smartapply-test';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-characters';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

test('authenticated encryption round-trips and uses a random IV', async () => {
  const { decryptSecret, encryptSecret } = await import('../src/utils/encryption.js');
  const first = encryptSecret('Naukri-password-1');
  const second = encryptSecret('Naukri-password-1');
  assert.equal(decryptSecret(first), 'Naukri-password-1');
  assert.notEqual(first.value, second.value);
  assert.notEqual(first.iv, second.iv);
});

test('apply history derives the daily count and normalizes its date', async () => {
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const history = new ApplyHistory({
    student: new mongoose.Types.ObjectId(),
    applicationDate: new Date('2026-08-10T18:30:00.000Z'),
    previousCount: 900,
    currentCount: 905,
    dailyCount: 999,
    recordedBy: new mongoose.Types.ObjectId(),
    source: 'student',
  });
  await history.validate();
  assert.equal(history.dailyCount, 5);
  assert.equal(history.applicationDate.toISOString(), '2026-08-10T00:00:00.000Z');
});

test('business dates roll over at midnight in India', async () => {
  const { businessDate } = await import('../src/utils/date.js');
  assert.equal(
    businessDate(new Date('2026-08-10T18:29:59.000Z')).toISOString(),
    '2026-08-10T00:00:00.000Z',
  );
  assert.equal(
    businessDate(new Date('2026-08-10T18:30:00.000Z')).toISOString(),
    '2026-08-11T00:00:00.000Z',
  );
});

test('apply history rejects a decreasing total', async () => {
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const history = new ApplyHistory({
    student: new mongoose.Types.ObjectId(),
    applicationDate: new Date(),
    previousCount: 905,
    currentCount: 900,
    dailyCount: 0,
    recordedBy: new mongoose.Types.ObjectId(),
    source: 'student',
  });
  await assert.rejects(history.validate(), /cannot be less than previous count/);
});

test('staff can be recorded as an application update source', async () => {
  const { ApplyHistory } = await import('../src/models/ApplyHistory.js');
  const history = new ApplyHistory({
    student: new mongoose.Types.ObjectId(),
    applicationDate: new Date(),
    previousCount: 0,
    currentCount: 10,
    dailyCount: 10,
    recordedBy: new mongoose.Types.ObjectId(),
    source: 'staff',
  });
  await history.validate();
  assert.equal(history.source, 'staff');
});

test('student snapshots reject manually inconsistent daily counts', async () => {
  const { Student } = await import('../src/models/Student.js');
  const student = new Student({
    candidateName: 'Example Student',
    mobileNumber: '+919999999999',
    personalEmail: 'student@example.com',
    city: 'Pune',
    collegeName: 'Example College',
    batch: '2026-A',
    trainerName: 'Example Trainer',
    technology: new mongoose.Types.ObjectId(),
    naukriEmail: 'student@naukri.example',
    currentTotalApplicationCount: 905,
    previousDayApplicationCount: 900,
    todayApplicationCount: 7,
    createdBy: new mongoose.Types.ObjectId(),
  });
  student.setNaukriPassword('Naukri-password-1');
  await assert.rejects(student.validate(), /must equal current total minus previous-day total/);
});

test('report date ranges cannot end before they begin', async () => {
  const { Report } = await import('../src/models/Report.js');
  const report = new Report({
    name: 'Invalid range',
    type: 'custom',
    format: 'csv',
    dateRange: { from: new Date('2026-08-10'), to: new Date('2026-08-01') },
    generatedBy: new mongoose.Types.ObjectId(),
  });
  await assert.rejects(report.validate(), /cannot be before start date/);
});

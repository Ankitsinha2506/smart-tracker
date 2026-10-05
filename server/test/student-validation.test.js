import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStudentSchema, updateStudentSchema } from '../src/validators/student.validator.js';

test('student create and edit require exactly 10 mobile digits', () => {
  const student = {
    candidateName: 'Example Candidate',
    personalEmail: 'candidate@example.com',
    technology: '507f1f77bcf86cd799439011',
    naukriEmail: 'naukri@example.com',
    naukriPassword: 'example-password',
  };
  for (const mobileNumber of ['9876543210', '1234567890']) {
    assert.equal(createStudentSchema.validate({ ...student, mobileNumber }).error, undefined);
    assert.equal(updateStudentSchema.validate({ mobileNumber }).error, undefined);
  }
  for (const mobileNumber of ['987654321', '98765432101', '987654321012345', '+919876543210', '98765abc10', '98765 3210', '']) {
    assert.ok(createStudentSchema.validate({ ...student, mobileNumber }).error);
    assert.ok(updateStudentSchema.validate({ mobileNumber }).error);
  }
});

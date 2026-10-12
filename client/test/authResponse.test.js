import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAuthResponse } from '../src/services/authResponse.js';

test('HTML and incomplete auth responses cannot create a session', () => {
  for (const data of ['<!doctype html><html></html>', {}, { success: true }, { success: true, data: { requiresOtp: true } }, { success: true, data: { accessToken: 'token' } }]) {
    assert.throws(() => readAuthResponse({ data }), /response/);
  }
});
test('OTP challenges cannot create a session', () => {
  const response = { data: { success: true, data: { requiresOtp: true, challengeToken: 'challenge' } } };
  assert.throws(() => readAuthResponse(response), /incomplete/);
});
test('completed login and refresh accept a valid session', () => {
  const data = { accessToken: 'token', user: { _id: 'user-id' } };
  assert.equal(readAuthResponse({ data: { success: true, data } }), data);
});

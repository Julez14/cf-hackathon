import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyImageLimit, nextDailyReset, serviceProblem, problemResponse } from '../promptroyale/src/free-limits.ts';

test('free-limit classification distinguishes daily, storage, model entitlement and capacity errors', async () => {
  assert.equal(serviceProblem(new Error('3036: You have used up your daily free allocation of 10,000 neurons')).code, 'FREE_AI_LIMIT');
  assert.equal(serviceProblem(new Error('D1_ERROR', { cause: new Error("Your account has exceeded D1's free tier daily row read limit.") })).code, 'FREE_SERVICE_LIMIT');
  assert.equal(serviceProblem(new Error('Your account has exceeded its daily write limit')).code, 'FREE_SERVICE_LIMIT');
  assert.equal(serviceProblem(new Error('database or disk is full: SQLITE_FULL')).code, 'FREE_STORAGE_LIMIT');
  assert.equal(serviceProblem(new Error('Your account has exceeded D1 maximum account storage limit')).resetAt, undefined);
  assert.equal(serviceProblem(new Error('3040: Out of capacity')).code, 'AI_BUSY');
  assert.equal(serviceProblem(new Error('5035: This model requires a Workers Paid plan')).code, 'FREE_MODEL_UNAVAILABLE');
  assert.equal(serviceProblem(new Error('Unauthorized')), null);
  assert.equal(serviceProblem(new Error('3007: Timeout')), null);
  assert.equal(nextDailyReset(Date.parse('2026-12-31T23:59:59Z')), '2027-01-01T00:00:00.000Z');
  const response = problemResponse(dailyImageLimit());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal((await response.json()).code, 'FREE_AI_LIMIT');
});

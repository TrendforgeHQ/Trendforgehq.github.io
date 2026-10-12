import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOAT_AUDIT_WORKFLOW, BOAT_REPOSITORY, authorizeTaskRequest,
  validateTaskRequest, validateTaskResponse
} from './boat-task-contract.mjs';

const sha = 'a'.repeat(40);
const request = () => ({
  schemaVersion: 1,
  taskType: 'published_catalogue_audit',
  pinnedCommitSha: sha,
  batchSize: 10,
  maxBatches: 1,
  budgetLimits: { aiCalls: 0, webRequests: 0 },
  idempotencyKey: 'boat-test-key-0001'
});
const context = (overrides = {}) => ({
  authenticated: true,
  role: 'operator',
  csrfValid: true,
  originAllowed: true,
  rateLimited: false,
  repository: BOAT_REPOSITORY,
  workflow: BOAT_AUDIT_WORKFLOW,
  allowedTaskTypes: ['published_catalogue_audit'],
  allowedCommitShas: [sha],
  maxBatchSize: 50,
  maxBatches: 5,
  maxAiCalls: 0,
  maxWebRequests: 0,
  usedIdempotencyKeys: [],
  ...overrides
});
const response = (overrides = {}) => ({
  schemaVersion: 1,
  taskId: 'boat_' + 'b'.repeat(24),
  taskType: 'published_catalogue_audit',
  status: 'paused',
  pinnedCommitSha: sha,
  createdAt: '2026-10-12T08:00:00.000Z',
  updatedAt: '2026-10-12T08:01:00.000Z',
  progress: { cursor: 'index:10', completedUnits: 10, totalUnits: 100 },
  findings: { total: 2, byCategory: { structure: 1, evidence: 1 } },
  budget: { aiCalls: 0, webRequests: 0, limits: { aiCalls: 0, webRequests: 0 } },
  report: { format: 'markdown', artifactName: 'boat-audit-test_001' },
  error: null,
  ...overrides
});

test('request contract accepts bounded, pinned, zero-budget audit requests', () => {
  assert.deepEqual(validateTaskRequest(request()), { valid: true, errors: [] });
  assert.equal(validateTaskRequest(null).valid, false);
});

test('request contract rejects extra fields, invalid pin, unbounded batch count, and nonzero budgets', () => {
  assert.match(validateTaskRequest({ ...request(), repository: 'attacker/repo' }).errors.join(' '), /unsupported fields/);
  assert.match(validateTaskRequest({ ...request(), pinnedCommitSha: 'main' }).errors.join(' '), /full lowercase commit SHA/);
  assert.match(validateTaskRequest({ ...request(), maxBatches: 0 }).errors.join(' '), /unbounded audits/);
  assert.match(validateTaskRequest({ ...request(), budgetLimits: { aiCalls: 1, webRequests: 0 } }).errors.join(' '), /budgetLimits/);
  assert.match(validateTaskRequest({ ...request(), idempotencyKey: 'short' }).errors.join(' '), /idempotencyKey/);
});

test('response contract accepts a bounded task response with consistent counters', () => {
  assert.deepEqual(validateTaskResponse(response()), { valid: true, errors: [] });
});

test('response contract rejects secret-like extra fields, inconsistent counters, and invalid status/error pairing', () => {
  assert.match(validateTaskResponse({ ...response(), token: 'must-not-leak' }).errors.join(' '), /unsupported fields/);
  assert.match(validateTaskResponse(response({ progress: { cursor: null, completedUnits: 11, totalUnits: 10 } })).errors.join(' '), /progress/);
  assert.match(validateTaskResponse(response({ findings: { total: 3, byCategory: { structure: 1 } } })).errors.join(' '), /findings/);
  assert.match(validateTaskResponse(response({ status: 'blocked', error: null })).errors.join(' '), /require a stable error/);
  assert.match(validateTaskResponse(response({ status: 'completed', error: { code: 'FORBIDDEN', message: 'no' } })).errors.join(' '), /must not expose an error/);
  assert.match(validateTaskResponse(response({ budget: { aiCalls: 1, webRequests: 0, limits: { aiCalls: 0, webRequests: 0 } } })).errors.join(' '), /budget counters/);
  assert.match(validateTaskResponse(response({ budget: { aiCalls: 0, webRequests: 0, limits: { aiCalls: 1, webRequests: 0 } } })).errors.join(' '), /budget counters/);
});

test('authorization allows only an operator-approved, pinned, bounded read-only audit', () => {
  const result = authorizeTaskRequest(request(), context());
  assert.equal(result.allowed, true);
  assert.equal(result.code, 'AUTHORIZED_READ_ONLY_AUDIT');
  assert.equal(result.policy.repository, BOAT_REPOSITORY);
  assert.equal(result.policy.workflow, BOAT_AUDIT_WORKFLOW);
  assert.equal(result.policy.mayPublish, false);
  assert.equal(result.policy.mayMerge, false);
  assert.equal(result.policy.budgetLimits.aiCalls, 0);
  assert.equal(result.policy.budgetLimits.webRequests, 0);
});

test('authorization denies unauthenticated, non-operator, invalid CSRF/origin, and rate-limited requests', () => {
  const cases = [
    [{ authenticated: false }, 'UNAUTHENTICATED'],
    [{ role: 'viewer' }, 'FORBIDDEN'],
    [{ csrfValid: false }, 'CSRF_INVALID'],
    [{ originAllowed: false }, 'ORIGIN_DENIED'],
    [{ rateLimited: true }, 'RATE_LIMITED']
  ];
  for (const [overrides, code] of cases) assert.equal(authorizeTaskRequest(request(), context(overrides)).code, code);
});

test('authorization denies wrong repo/workflow, unapproved task type, and unallowlisted commit', () => {
  assert.equal(authorizeTaskRequest(request(), context({ repository: 'attacker/repo' })).code, 'REPOSITORY_POLICY_MISMATCH');
  assert.equal(authorizeTaskRequest(request(), context({ workflow: 'publish.yml' })).code, 'REPOSITORY_POLICY_MISMATCH');
  assert.equal(authorizeTaskRequest(request(), context({ allowedTaskTypes: [] })).code, 'TASK_TYPE_DENIED');
  assert.equal(authorizeTaskRequest(request(), context({ allowedCommitShas: [] })).code, 'COMMIT_NOT_ALLOWLISTED');
});

test('authorization denies expanded budgets, batch limits, and idempotency replay', () => {
  assert.equal(authorizeTaskRequest(request(), context({ maxAiCalls: 1 })).code, 'BUDGET_DENIED');
  assert.equal(authorizeTaskRequest(request(), context({ maxBatchSize: undefined })).code, 'BATCH_LIMIT_EXCEEDED');
  assert.equal(authorizeTaskRequest({ ...request(), batchSize: 50 }, context({ maxBatchSize: 25 })).code, 'BATCH_LIMIT_EXCEEDED');
  assert.equal(authorizeTaskRequest({ ...request(), maxBatches: 5 }, context({ maxBatches: 2 })).code, 'BATCH_LIMIT_EXCEEDED');
  assert.equal(authorizeTaskRequest(request(), context({ usedIdempotencyKeys: ['boat-test-key-0001'] })).code, 'IDEMPOTENCY_REPLAY');
  assert.equal(authorizeTaskRequest({ ...request(), maxBatches: 0 }, context()).code, 'INVALID_REQUEST');
});

test('authorization policy is pure and cannot be widened by request-supplied repository or role fields', () => {
  const malicious = { ...request(), repository: 'attacker/repo', role: 'operator', workflow: 'publish.yml' };
  const result = authorizeTaskRequest(malicious, context());
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'INVALID_REQUEST');
});

test('versioned JSON Schema files are valid JSON and match the bounded contract', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const requestSchema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/task-request.schema.json'), 'utf8'));
  const responseSchema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/task-response.schema.json'), 'utf8'));
  assert.equal(requestSchema.properties.schemaVersion.const, 1);
  assert.equal(requestSchema.additionalProperties, false);
  assert.deepEqual(requestSchema.properties.batchSize.enum, [10, 25, 50]);
  assert.deepEqual(requestSchema.properties.maxBatches.enum, [1, 2, 5]);
  assert.equal(requestSchema.properties.budgetLimits.properties.aiCalls.const, 0);
  assert.equal(requestSchema.properties.budgetLimits.properties.webRequests.const, 0);
  assert.equal(responseSchema.properties.schemaVersion.const, 1);
  assert.equal(responseSchema.additionalProperties, false);
  assert.ok(responseSchema.required.includes('error'));
});

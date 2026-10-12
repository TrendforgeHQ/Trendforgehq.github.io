/**
 * Dependency-free BOAT task API contract and fail-closed authorization policy.
 * Pure policy code for offline tests; this is not an HTTP server or auth system.
 */
export const TASK_REQUEST_SCHEMA_VERSION = 1;
export const TASK_RESPONSE_SCHEMA_VERSION = 1;
export const BOAT_REPOSITORY = 'TrendforgeHQ/Trendforgehq.github.io';
export const BOAT_AUDIT_WORKFLOW = 'boat-manual-audit.yml';
export const ALLOWED_TASK_TYPES = Object.freeze(['published_catalogue_audit']);
export const ALLOWED_BATCH_SIZES = Object.freeze([10, 25, 50]);
export const ALLOWED_MAX_BATCHES = Object.freeze([1, 2, 5]);
export const STABLE_ERROR_CODES = Object.freeze([
  'INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'CSRF_INVALID',
  'ORIGIN_DENIED', 'RATE_LIMITED', 'REPOSITORY_POLICY_MISMATCH',
  'TASK_TYPE_DENIED', 'COMMIT_NOT_ALLOWLISTED', 'BUDGET_DENIED',
  'BATCH_LIMIT_EXCEEDED', 'IDEMPOTENCY_REPLAY', 'INVALID_RESPONSE'
]);
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isSha = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
const isTaskId = v => typeof v === 'string' && /^boat_[a-f0-9]{24}$/.test(v);
const isIsoDate = v => typeof v === 'string' && Number.isFinite(Date.parse(v));
const onlyKeys = (v, keys) => Object.keys(v).every(k => keys.includes(k));
const nonNegativeInt = v => Number.isSafeInteger(v) && v >= 0;

export function validateTaskRequest(request) {
  const errors = [];
  if (!isObject(request)) return { valid: false, errors: ['request must be an object'] };
  const keys = ['schemaVersion','taskType','pinnedCommitSha','batchSize','maxBatches','budgetLimits','idempotencyKey'];
  if (!onlyKeys(request, keys)) errors.push('request contains unsupported fields');
  if (request.schemaVersion !== 1) errors.push('unsupported schemaVersion');
  if (!ALLOWED_TASK_TYPES.includes(request.taskType)) errors.push('unsupported taskType');
  if (!isSha(request.pinnedCommitSha)) errors.push('pinnedCommitSha must be a full lowercase commit SHA');
  if (!ALLOWED_BATCH_SIZES.includes(request.batchSize)) errors.push('batchSize must be one of 10, 25, 50');
  if (!ALLOWED_MAX_BATCHES.includes(request.maxBatches)) errors.push('maxBatches must be one of 1, 2, 5; unbounded audits are not accepted');
  if (!isObject(request.budgetLimits) || !onlyKeys(request.budgetLimits, ['aiCalls','webRequests']) ||
      request.budgetLimits.aiCalls !== 0 || request.budgetLimits.webRequests !== 0) errors.push('budgetLimits must contain only aiCalls: 0 and webRequests: 0');
  if (typeof request.idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{16,128}$/.test(request.idempotencyKey)) errors.push('idempotencyKey must be 16-128 safe ASCII characters');
  return { valid: errors.length === 0, errors };
}

export function validateTaskResponse(response) {
  const errors = [];
  if (!isObject(response)) return { valid: false, errors: ['response must be an object'] };
  const keys = ['schemaVersion','taskId','taskType','status','pinnedCommitSha','createdAt','updatedAt','progress','findings','budget','report','error'];
  if (!onlyKeys(response, keys)) errors.push('response contains unsupported fields');
  if (response.schemaVersion !== 1) errors.push('unsupported response schemaVersion');
  if (!isTaskId(response.taskId)) errors.push('invalid taskId');
  if (!ALLOWED_TASK_TYPES.includes(response.taskType)) errors.push('unsupported taskType');
  if (!['queued','running','paused','needs_review','blocked','completed','failed'].includes(response.status)) errors.push('invalid status');
  if (!isSha(response.pinnedCommitSha)) errors.push('invalid pinnedCommitSha');
  if (!isIsoDate(response.createdAt) || !isIsoDate(response.updatedAt)) errors.push('invalid timestamps');
  const p = response.progress;
  if (!isObject(p) || !onlyKeys(p, ['cursor','completedUnits','totalUnits']) ||
      !(p.cursor === null || typeof p.cursor === 'string') || !nonNegativeInt(p.completedUnits) ||
      !nonNegativeInt(p.totalUnits) || p.completedUnits > p.totalUnits) errors.push('invalid progress');
  const f = response.findings;
  if (!isObject(f) || !onlyKeys(f, ['total','byCategory']) || !nonNegativeInt(f.total) ||
      !isObject(f.byCategory) || Object.values(f.byCategory).some(v => !nonNegativeInt(v)) ||
      (isObject(f.byCategory) && Object.values(f.byCategory).reduce((a,v) => a + (nonNegativeInt(v) ? v : 0), 0) !== f.total)) errors.push('invalid findings summary');
  const b = response.budget;
  if (!isObject(b) || !onlyKeys(b, ['aiCalls','webRequests','limits']) || !nonNegativeInt(b.aiCalls) ||
      !nonNegativeInt(b.webRequests) || !isObject(b.limits) || !onlyKeys(b.limits, ['aiCalls','webRequests']) ||
      !nonNegativeInt(b.limits.aiCalls) || !nonNegativeInt(b.limits.webRequests) ||
      (isObject(b) && (b.aiCalls > (b.limits?.aiCalls ?? -1) || b.webRequests > (b.limits?.webRequests ?? -1)))) errors.push('invalid budget counters or limits');
  const report = response.report;
  if (!isObject(report) || !onlyKeys(report, ['format','artifactName']) || report.format !== 'markdown' ||
      !(report.artifactName === null || (typeof report.artifactName === 'string' && /^boat-audit-[A-Za-z0-9_-]{1,100}$/.test(report.artifactName)))) errors.push('invalid report reference');
  if (response.error !== null && (!isObject(response.error) || !onlyKeys(response.error, ['code','message']) ||
      !STABLE_ERROR_CODES.includes(response.error.code) || typeof response.error.message !== 'string' || response.error.message.length > 500)) errors.push('invalid stable error object');
  if (response.status === 'failed' || response.status === 'blocked') {
    if (response.error === null) errors.push('blocked/failed responses require a stable error object');
  } else if (response.error !== null) errors.push('non-error status must not expose an error object');
  return { valid: errors.length === 0, errors };
}

/** Context must come from trusted server code, never from the client request. */
export function authorizeTaskRequest(request, context) {
  const validation = validateTaskRequest(request);
  if (!validation.valid) return { allowed: false, code: 'INVALID_REQUEST', errors: validation.errors };
  if (!isObject(context) || context.authenticated !== true) return { allowed: false, code: 'UNAUTHENTICATED' };
  if (context.role !== 'operator') return { allowed: false, code: 'FORBIDDEN' };
  if (context.csrfValid !== true) return { allowed: false, code: 'CSRF_INVALID' };
  if (context.originAllowed !== true) return { allowed: false, code: 'ORIGIN_DENIED' };
  if (context.rateLimited === true) return { allowed: false, code: 'RATE_LIMITED' };
  if (context.repository !== BOAT_REPOSITORY || context.workflow !== BOAT_AUDIT_WORKFLOW) return { allowed: false, code: 'REPOSITORY_POLICY_MISMATCH' };
  if (!Array.isArray(context.allowedTaskTypes) || !context.allowedTaskTypes.includes(request.taskType)) return { allowed: false, code: 'TASK_TYPE_DENIED' };
  if (!Array.isArray(context.allowedCommitShas) || !context.allowedCommitShas.includes(request.pinnedCommitSha)) return { allowed: false, code: 'COMMIT_NOT_ALLOWLISTED' };
  if ((context.maxBatchSize !== undefined && request.batchSize > context.maxBatchSize) ||
      (context.maxBatches !== undefined && request.maxBatches > context.maxBatches)) return { allowed: false, code: 'BATCH_LIMIT_EXCEEDED' };
  if (context.maxAiCalls !== 0 || context.maxWebRequests !== 0 ||
      request.budgetLimits.aiCalls !== 0 || request.budgetLimits.webRequests !== 0) return { allowed: false, code: 'BUDGET_DENIED' };
  if (Array.isArray(context.usedIdempotencyKeys) && context.usedIdempotencyKeys.includes(request.idempotencyKey)) return { allowed: false, code: 'IDEMPOTENCY_REPLAY' };
  return {
    allowed: true, code: 'AUTHORIZED_READ_ONLY_AUDIT',
    policy: {
      repository: BOAT_REPOSITORY, workflow: BOAT_AUDIT_WORKFLOW, taskType: request.taskType,
      pinnedCommitSha: request.pinnedCommitSha, batchSize: request.batchSize, maxBatches: request.maxBatches,
      budgetLimits: { aiCalls: 0, webRequests: 0 }, requiresHumanApprovalForMutation: true, mayPublish: false, mayMerge: false
    }
  };
}

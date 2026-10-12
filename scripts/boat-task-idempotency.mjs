/**
 * Portable, dependency-free idempotency ledger for future BOAT task brokers.
 * This is local file persistence, not a distributed database or live API.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateTaskRequest } from './boat-task-contract.mjs';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isTaskId = value => typeof value === 'string' && /^boat_[a-f0-9]{24}$/.test(value);
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
};
const stableJson = value => JSON.stringify(canonical(value));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const requestFingerprint = request => {
  const { idempotencyKey, ...semanticRequest } = request;
  return sha256(stableJson(semanticRequest));
};

export function createEmptyIdempotencyLedger() {
  return { schemaVersion: 1, revision: 0, entries: [] };
}

export function validateIdempotencyLedger(ledger) {
  const errors = [];
  if (!isObject(ledger)) return { valid: false, errors: ['ledger must be an object'] };
  if (ledger.schemaVersion !== 1) errors.push('unsupported ledger schemaVersion');
  if (!Number.isSafeInteger(ledger.revision) || ledger.revision < 0) errors.push('invalid ledger revision');
  if (!Array.isArray(ledger.entries)) errors.push('ledger entries must be an array');
  if (Array.isArray(ledger.entries)) {
    const keys = new Set();
    for (const entry of ledger.entries) {
      if (!isObject(entry) || typeof entry.idempotencyKey !== 'string' ||
          !/^[A-Za-z0-9._:-]{16,128}$/.test(entry.idempotencyKey) ||
          !/^[a-f0-9]{64}$/.test(entry.requestHash) || !isTaskId(entry.taskId) ||
          typeof entry.createdAt !== 'string' || !Number.isFinite(Date.parse(entry.createdAt))) {
        errors.push('invalid ledger entry');
        continue;
      }
      if (keys.has(entry.idempotencyKey)) errors.push('duplicate idempotency key');
      keys.add(entry.idempotencyKey);
    }
    if (ledger.entries.length > ledger.revision) errors.push('entry count cannot exceed ledger revision');
  }
  return { valid: errors.length === 0, errors };
}

function assertLedger(ledger) {
  const result = validateIdempotencyLedger(ledger);
  if (!result.valid) throw new Error(`Invalid BOAT idempotency ledger: ${result.errors.join('; ')}`);
}

/**
 * Pure decision function. Same key + same semantic request returns the original
 * task ID. Same key + changed request is a conflict. New keys create a claim.
 */
export function resolveIdempotency(ledger, request, proposedTaskId, { createdAt = new Date().toISOString() } = {}) {
  assertLedger(ledger);
  const requestValidation = validateTaskRequest(request);
  if (!requestValidation.valid) return { outcome: 'invalid_request', errors: requestValidation.errors };
  if (!isTaskId(proposedTaskId)) return { outcome: 'invalid_task_id' };
  if (!Number.isFinite(Date.parse(createdAt))) return { outcome: 'invalid_timestamp' };
  const requestHash = requestFingerprint(request);
  const existing = ledger.entries.find(entry => entry.idempotencyKey === request.idempotencyKey);
  if (existing) {
    if (existing.requestHash !== requestHash) return { outcome: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST' };
    return { outcome: 'replay', taskId: existing.taskId, requestHash, ledger, created: false };
  }
  const next = {
    ...ledger,
    revision: ledger.revision + 1,
    entries: [...ledger.entries, {
      idempotencyKey: request.idempotencyKey,
      requestHash,
      taskId: proposedTaskId,
      createdAt
    }]
  };
  assertLedger(next);
  return { outcome: 'created', taskId: proposedTaskId, requestHash, ledger: next, created: true };
}

export async function loadIdempotencyLedger(filePath) {
  let raw;
  try { raw = await fs.readFile(filePath, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return createEmptyIdempotencyLedger(); throw error; }
  let ledger;
  try { ledger = JSON.parse(raw); }
  catch (error) { throw new Error(`Corrupt BOAT idempotency ledger at ${filePath}: ${error.message}`); }
  assertLedger(ledger);
  return ledger;
}

/**
 * Atomically claim a key under an exclusive local lock. Lock collisions fail
 * closed; stale locks require explicit operator recovery. The file must live in
 * a private, durable workspace. This does not coordinate separate machines.
 */
export async function claimIdempotencyKey(filePath, request, proposedTaskId, { createdAt = new Date().toISOString() } = {}) {
  const validation = validateTaskRequest(request);
  if (!validation.valid) return { outcome: 'invalid_request', errors: validation.errors };
  if (!isTaskId(proposedTaskId)) return { outcome: 'invalid_task_id' };
  if (!Number.isFinite(Date.parse(createdAt))) return { outcome: 'invalid_timestamp' };

  const absolute = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const lockPath = `${absolute}.lock`;
  let lock;
  try { lock = await fs.open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') return { outcome: 'locked' };
    throw error;
  }
  let tempPath;
  try {
    const ledger = await loadIdempotencyLedger(absolute);
    const decision = resolveIdempotency(ledger, request, proposedTaskId, { createdAt });
    if (decision.outcome !== 'created') return decision;
    tempPath = `${absolute}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    const temp = await fs.open(tempPath, 'wx', 0o600);
    try {
      await temp.writeFile(JSON.stringify(decision.ledger, null, 2) + '\n', 'utf8');
      await temp.sync();
    } finally { await temp.close(); }
    await fs.rename(tempPath, absolute);
    return { outcome: 'created', taskId: decision.taskId, requestHash: decision.requestHash, revision: decision.ledger.revision };
  } finally {
    if (tempPath) await fs.rm(tempPath, { force: true }).catch(() => {});
    await lock.close().catch(() => {});
    await fs.rm(lockPath, { force: true }).catch(() => {});
  }
}

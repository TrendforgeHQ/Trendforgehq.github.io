import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const TASK_SCHEMA_VERSION = '1.0';
export const TASK_TYPES = Object.freeze(['published_catalogue_audit', 'article_audit']);
export const TASK_STATUSES = Object.freeze(['queued', 'running', 'paused', 'needs_review', 'blocked', 'completed', 'failed']);

const transitions = {
  queued: new Set(['running', 'blocked', 'failed']),
  running: new Set(['running', 'paused', 'needs_review', 'blocked', 'completed', 'failed']),
  paused: new Set(['running', 'blocked', 'failed']),
  needs_review: new Set(['running', 'completed', 'blocked', 'failed']),
  blocked: new Set(['queued', 'running', 'failed']),
  completed: new Set(),
  failed: new Set(['queued'])
};

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
const stableJson = value => JSON.stringify(canonical(value));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const clone = value => structuredClone(value);

export function createTaskRecord({ taskType, pinnedCommitSha, config = {}, createdAt = new Date().toISOString(), budgetLimits = {} }) {
  if (!TASK_TYPES.includes(taskType)) throw new Error(`Unsupported task type: ${taskType}`);
  if (!isSha(pinnedCommitSha)) throw new Error('pinnedCommitSha must be a full 40-character lowercase commit SHA');
  if (!isDate(createdAt)) throw new Error('createdAt must be a valid ISO-compatible date-time');
  if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('config must be an object');
  const normalizedConfig = canonical(config);
  const identity = sha256(stableJson({ schemaVersion: TASK_SCHEMA_VERSION, taskType, pinnedCommitSha, config: normalizedConfig }));
  const limits = {
    aiCalls: Number.isInteger(budgetLimits.aiCalls) && budgetLimits.aiCalls >= 0 ? budgetLimits.aiCalls : 0,
    webRequests: Number.isInteger(budgetLimits.webRequests) && budgetLimits.webRequests >= 0 ? budgetLimits.webRequests : 0
  };
  return {
    schemaVersion: TASK_SCHEMA_VERSION,
    taskId: `boat_${identity.slice(0, 24)}`,
    taskType,
    pinnedCommitSha,
    config: normalizedConfig,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    revision: 0,
    checkpoint: { cursor: null, completedUnits: [] },
    findings: [],
    errors: [],
    budget: { aiCalls: 0, webRequests: 0, limits }
  };
}

export function validateTaskRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { valid: false, errors: ['record must be an object'] };
  if (record.schemaVersion !== TASK_SCHEMA_VERSION) errors.push('unsupported schemaVersion');
  if (typeof record.taskId !== 'string' || !/^boat_[a-f0-9]{24}$/.test(record.taskId)) errors.push('invalid taskId');
  if (!TASK_TYPES.includes(record.taskType)) errors.push('unsupported taskType');
  if (!isSha(record.pinnedCommitSha)) errors.push('invalid pinnedCommitSha');
  if (!TASK_STATUSES.includes(record.status)) errors.push('invalid status');
  if (!isDate(record.createdAt) || !isDate(record.updatedAt)) errors.push('invalid timestamps');
  if (!Number.isInteger(record.revision) || record.revision < 0) errors.push('revision must be a non-negative integer');
  if (!record.config || typeof record.config !== 'object' || Array.isArray(record.config)) errors.push('config must be an object');
  if (!record.checkpoint || !Array.isArray(record.checkpoint.completedUnits)) errors.push('invalid checkpoint');
  if (!Array.isArray(record.findings) || !Array.isArray(record.errors)) errors.push('findings and errors must be arrays');
  if (!record.budget || !Number.isInteger(record.budget.aiCalls) || !Number.isInteger(record.budget.webRequests) || !record.budget.limits) errors.push('invalid budget counters');
  if (Array.isArray(record.findings)) {
    const ids = new Set();
    for (const finding of record.findings) {
      if (!finding || typeof finding.findingId !== 'string' || !finding.findingId) errors.push('each finding requires a findingId');
      else if (ids.has(finding.findingId)) errors.push('duplicate findingId');
      else ids.add(finding.findingId);
    }
  }
  return { valid: errors.length === 0, errors };
}

function assertValid(record) {
  const result = validateTaskRecord(record);
  if (!result.valid) throw new Error(`Invalid BOAT task record: ${result.errors.join('; ')}`);
}

function nextRecord(record, changes, updatedAt) {
  assertValid(record);
  if (!isDate(updatedAt)) throw new Error('updatedAt must be a valid ISO-compatible date-time');
  const next = { ...clone(record), ...changes, updatedAt, revision: record.revision + 1 };
  assertValid(next);
  return next;
}

export function transitionTask(record, status, { updatedAt = new Date().toISOString(), reason = null } = {}) {
  assertValid(record);
  if (!TASK_STATUSES.includes(status)) throw new Error(`Unsupported task status: ${status}`);
  if (status !== record.status && !transitions[record.status].has(status)) {
    throw new Error(`Invalid task transition: ${record.status} -> ${status}`);
  }
  const errors = reason ? [...record.errors, { code: 'STATUS_NOTE', message: String(reason), at: updatedAt }] : record.errors;
  return nextRecord(record, { status, errors }, updatedAt);
}

export function checkpointTask(record, { cursor = null, completedUnitIds = [], updatedAt = new Date().toISOString() } = {}) {
  assertValid(record);
  if (!['running', 'paused'].includes(record.status)) throw new Error('Checkpoint requires a running or paused task');
  if (!Array.isArray(completedUnitIds) || completedUnitIds.some(id => typeof id !== 'string' || !id)) {
    throw new Error('completedUnitIds must contain non-empty strings');
  }
  const completed = [...new Set([...record.checkpoint.completedUnits, ...completedUnitIds])].sort();
  return nextRecord(record, { checkpoint: { cursor, completedUnits: completed } }, updatedAt);
}

export function addTaskFindings(record, findings, { updatedAt = new Date().toISOString() } = {}) {
  assertValid(record);
  if (!Array.isArray(findings)) throw new Error('findings must be an array');
  const byId = new Map(record.findings.map(item => [item.findingId, item]));
  for (const finding of findings) {
    if (!finding || typeof finding.findingId !== 'string' || !finding.findingId.trim()) {
      throw new Error('Every finding must have a non-empty findingId');
    }
    const existing = byId.get(finding.findingId);
    if (existing && stableJson(existing) !== stableJson(finding)) {
      throw new Error(`Conflicting payload for existing findingId: ${finding.findingId}`);
    }
    byId.set(finding.findingId, canonical(finding));
  }
  const merged = [...byId.values()].sort((a, b) => a.findingId.localeCompare(b.findingId));
  return nextRecord(record, { findings: merged }, updatedAt);
}

export function consumeTaskBudget(record, kind, amount = 1, { updatedAt = new Date().toISOString() } = {}) {
  assertValid(record);
  if (!['aiCalls', 'webRequests'].includes(kind)) throw new Error('Unsupported budget kind');
  if (!Number.isInteger(amount) || amount < 1) throw new Error('amount must be a positive integer');
  const used = record.budget[kind] + amount;
  if (used > record.budget.limits[kind]) throw new Error(`Task budget exhausted: ${kind} limit ${record.budget.limits[kind]}`);
  return nextRecord(record, { budget: { ...record.budget, [kind]: used } }, updatedAt);
}

export async function loadTaskRecord(filePath) {
  const raw = await fs.promises.readFile(filePath, 'utf8');
  let record;
  try { record = JSON.parse(raw); }
  catch (error) { throw new Error(`Corrupt BOAT task JSON at ${filePath}: ${error.message}`); }
  assertValid(record);
  return record;
}

/**
 * Save atomically with optimistic revision checking and an exclusive lock.
 * expectedRevision=null means the file must not exist yet. A stale lock is not
 * removed automatically; recovery must be an explicit operator decision.
 */
export async function saveTaskRecord(filePath, record, { expectedRevision = null } = {}) {
  assertValid(record);
  if (expectedRevision !== null && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) {
    throw new Error('expectedRevision must be a non-negative integer or null');
  }
  const absolute = path.resolve(filePath);
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  const lockPath = `${absolute}.lock`;
  let lock;
  try { lock = await fs.promises.open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Task state is locked by another writer: ${absolute}`);
    throw error;
  }
  let tempPath;
  try {
    let existing = null;
    try { existing = await loadTaskRecord(absolute); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing === null && expectedRevision !== null) throw new Error('Task state conflict: expected an existing revision');
    if (existing !== null && expectedRevision !== existing.revision) {
      throw new Error(`Task state conflict: expected revision ${expectedRevision}, found ${existing.revision}`);
    }
    if (existing && existing.taskId !== record.taskId) throw new Error('Task state conflict: taskId mismatch');
    if (existing && record.revision <= existing.revision) throw new Error('Task state conflict: new revision must be greater than the stored revision');
    if (!existing && record.revision !== 0) throw new Error('Task state conflict: a new task must start at revision 0');
    tempPath = `${absolute}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    const temp = await fs.promises.open(tempPath, 'wx', 0o600);
    try {
      await temp.writeFile(JSON.stringify(record, null, 2) + '\n', 'utf8');
      await temp.sync();
    } finally { await temp.close(); }
    await fs.promises.rename(tempPath, absolute);
    return { saved: true, revision: record.revision };
  } finally {
    if (tempPath) await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    await lock.close().catch(() => {});
    await fs.promises.rm(lockPath, { force: true }).catch(() => {});
  }
}

/**
 * Single-file BOAT task store: task records and idempotency claims commit together.
 * Local durable workspace only; not a distributed database or authentication layer.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createTaskRecord, transitionTask, validateTaskRecord } from './boat-task-state.mjs';
import { validateTaskRequest } from './boat-task-contract.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const taskIdOk = value => typeof value === 'string' && /^boat_[a-f0-9]{24}$/.test(value);
const keyOk = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{16,128}$/.test(value);

function semanticRequest(request) {
  const { idempotencyKey, ...semantic } = request;
  return semantic;
}

export function createEmptyTaskStore() {
  return { schemaVersion: 1, revision: 0, tasks: [], idempotency: [] };
}

export function validateTaskStore(store) {
  const errors = [];
  if (!object(store)) return { valid: false, errors: ['store must be an object'] };
  if (store.schemaVersion !== 1) errors.push('unsupported store schemaVersion');
  if (!Number.isSafeInteger(store.revision) || store.revision < 0) errors.push('invalid store revision');
  if (!Array.isArray(store.tasks) || !Array.isArray(store.idempotency)) {
    errors.push('tasks and idempotency must be arrays');
    return { valid: false, errors };
  }
  const taskIds = new Set();
  for (const task of store.tasks) {
    const result = validateTaskRecord(task);
    if (!result.valid) errors.push(...result.errors.map(error => `task: ${error}`));
    if (taskIds.has(task?.taskId)) errors.push('duplicate taskId');
    taskIds.add(task?.taskId);
  }
  const keys = new Set();
  for (const item of store.idempotency) {
    if (!object(item) || !keyOk(item.key) || !/^[a-f0-9]{64}$/.test(item.requestHash) || !taskIdOk(item.taskId)) {
      errors.push('invalid idempotency entry');
      continue;
    }
    if (keys.has(item.key)) errors.push('duplicate idempotency key');
    keys.add(item.key);
    if (!taskIds.has(item.taskId)) errors.push('idempotency entry points to missing task');
  }
  if (store.idempotency.length > store.revision) errors.push('idempotency entry count exceeds store revision');
  return { valid: errors.length === 0, errors };
}

function assertStore(store) {
  const result = validateTaskStore(store);
  if (!result.valid) throw new Error(`Invalid BOAT task store: ${result.errors.join('; ')}`);
}

export async function loadTaskStore(filePath) {
  let raw;
  try { raw = await fs.readFile(filePath, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') return createEmptyTaskStore();
    throw error;
  }
  let store;
  try { store = JSON.parse(raw); }
  catch (error) { throw new Error(`Corrupt BOAT task store at ${filePath}: ${error.message}`); }
  assertStore(store);
  return store;
}

async function withStoreLock(filePath, action) {
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
    const store = await loadTaskStore(absolute);
    const result = await action(store);
    if (!result.write) return result.value;
    assertStore(result.store);
    tempPath = `${absolute}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    const temp = await fs.open(tempPath, 'wx', 0o600);
    try {
      await temp.writeFile(JSON.stringify(result.store, null, 2) + '\n', 'utf8');
      await temp.sync();
    } finally { await temp.close(); }
    await fs.rename(tempPath, absolute);
    return result.value;
  } finally {
    if (tempPath) await fs.rm(tempPath, { force: true }).catch(() => {});
    await lock.close().catch(() => {});
    await fs.rm(lockPath, { force: true }).catch(() => {});
  }
}

/**
 * Validates, idempotency-claims, and stores a new task record in one atomic
 * JSON-file replacement. A replay returns the existing task; changed payloads
 * under a reused key conflict. No workflow is dispatched here.
 */
export async function submitTaskRequest(filePath, request, { createdAt = new Date().toISOString() } = {}) {
  const validation = validateTaskRequest(request);
  if (!validation.valid) return { outcome: 'invalid_request', errors: validation.errors };
  if (!Number.isFinite(Date.parse(createdAt))) return { outcome: 'invalid_timestamp' };
  return withStoreLock(filePath, store => {
    const requestHash = hash(stable(semanticRequest(request)));
    const existing = store.idempotency.find(item => item.key === request.idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return { write: false, value: { outcome: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST' } };
      }
      const task = store.tasks.find(item => item.taskId === existing.taskId);
      return { write: false, value: { outcome: 'replay', task: structuredClone(task), storeRevision: store.revision } };
    }

    const task = createTaskRecord({
      taskType: request.taskType,
      pinnedCommitSha: request.pinnedCommitSha,
      config: { batchSize: request.batchSize, maxBatches: request.maxBatches },
      createdAt,
      budgetLimits: request.budgetLimits
    });
    const next = {
      ...store,
      revision: store.revision + 1,
      tasks: store.tasks.some(item => item.taskId === task.taskId) ? store.tasks : [...store.tasks, task],
      idempotency: [...store.idempotency, { key: request.idempotencyKey, requestHash, taskId: task.taskId }]
    };
    return { write: true, store: next, value: { outcome: 'created', task: structuredClone(task), storeRevision: next.revision } };
  });
}



/**
 * Registers a deterministic catalogue task and idempotency claim together.
 * Retains the runner's full audit configuration without weakening the public request schema.
 */
export async function registerStoredTask(filePath, taskRecord, idempotencyKey) {
  const validation = validateTaskRecord(taskRecord);
  if (!validation.valid) return { outcome: 'invalid_task', errors: validation.errors };
  if (!keyOk(idempotencyKey)) return { outcome: 'invalid_idempotency_key' };
  const identity = { taskType: taskRecord.taskType, pinnedCommitSha: taskRecord.pinnedCommitSha, config: taskRecord.config };
  const requestHash = hash(stable(identity));
  return withStoreLock(filePath, store => {
    const claim = store.idempotency.find(item => item.key === idempotencyKey);
    if (claim && claim.requestHash !== requestHash) {
      return { write: false, value: { outcome: 'conflict', code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_TASK' } };
    }
    const existing = store.tasks.find(item => item.taskId === taskRecord.taskId);
    if (existing) {
      const existingIdentity = { taskType: existing.taskType, pinnedCommitSha: existing.pinnedCommitSha, config: existing.config };
      if (stable(existingIdentity) !== stable(identity)) return { write: false, value: { outcome: 'task_identity_conflict' } };
      if (claim && claim.taskId !== existing.taskId) return { write: false, value: { outcome: 'conflict', code: 'IDEMPOTENCY_KEY_POINTS_TO_DIFFERENT_TASK' } };
      if (claim) return { write: false, value: { outcome: 'replay', task: structuredClone(existing), storeRevision: store.revision } };
      const next = { ...store, revision: store.revision + 1, idempotency: [...store.idempotency, { key: idempotencyKey, requestHash, taskId: existing.taskId }] };
      return { write: true, store: next, value: { outcome: 'replay', task: structuredClone(existing), storeRevision: next.revision } };
    }
    if (claim) return { write: false, value: { outcome: 'conflict', code: 'IDEMPOTENCY_TASK_MISSING' } };
    if (taskRecord.status !== 'queued' || taskRecord.revision !== 0) return { write: false, value: { outcome: 'invalid_initial_task_state' } };
    const next = {
      ...store, revision: store.revision + 1,
      tasks: [...store.tasks, structuredClone(taskRecord)],
      idempotency: [...store.idempotency, { key: idempotencyKey, requestHash, taskId: taskRecord.taskId }]
    };
    return { write: true, store: next, value: { outcome: 'created', task: structuredClone(taskRecord), storeRevision: next.revision } };
  });
}

/**
 * Atomically advances one persisted task inside the unified store.
 * The expected task revision is checked while holding the store lock; a stale
 * worker cannot overwrite newer checkpoints/findings. The updater must return
 * exactly the next task revision. No work is executed by this primitive.
 */
export async function updateStoredTask(filePath, taskId, expectedTaskRevision, updater) {
  if (!taskIdOk(taskId) || !Number.isSafeInteger(expectedTaskRevision) || expectedTaskRevision < 0 || typeof updater !== 'function') {
    return { outcome: 'invalid_update' };
  }
  return withStoreLock(filePath, store => {
    const index = store.tasks.findIndex(task => task.taskId === taskId);
    if (index < 0) return { write: false, value: { outcome: 'not_found' } };
    const current = store.tasks[index];
    if (current.revision !== expectedTaskRevision) {
      return { write: false, value: { outcome: 'revision_conflict', currentRevision: current.revision, storeRevision: store.revision } };
    }
    const nextTask = updater(structuredClone(current));
    const validation = validateTaskRecord(nextTask);
    if (!validation.valid) throw new Error(`Invalid updated BOAT task: ${validation.errors.join('; ')}`);
    if (nextTask.taskId !== taskId || nextTask.revision <= current.revision) {
      throw new Error('Task updater must preserve taskId and advance the task revision');
    }
    const next = {
      ...store,
      revision: store.revision + 1,
      tasks: store.tasks.map((task, taskIndex) => taskIndex === index ? nextTask : task)
    };
    return { write: true, store: next, value: { outcome: 'updated', task: structuredClone(nextTask), storeRevision: next.revision } };
  });
}

/**
 * On startup, convert persisted 'running' tasks to 'paused' with their last
 * checkpoint preserved. The caller must explicitly resume paused tasks; this
 * function never executes work or dispatches a workflow.
 */
export async function recoverInterruptedTasks(filePath, { recoveredAt = new Date().toISOString() } = {}) {
  if (!Number.isFinite(Date.parse(recoveredAt))) return { outcome: 'invalid_timestamp' };
  return withStoreLock(filePath, store => {
    const interrupted = store.tasks.filter(task => task.status === 'running');
    if (interrupted.length === 0) {
      return { write: false, value: { outcome: 'no_interrupted_tasks', recoveredTaskIds: [], storeRevision: store.revision } };
    }
    const recoveredIds = new Set(interrupted.map(task => task.taskId));
    const tasks = store.tasks.map(task => recoveredIds.has(task.taskId)
      ? transitionTask(task, 'paused', { updatedAt: recoveredAt, reason: 'RECOVERED_AFTER_INTERRUPTED_RUN; resume requires explicit operator action' })
      : task);
    const next = { ...store, revision: store.revision + 1, tasks };
    return {
      write: true, store: next,
      value: { outcome: 'recovered', recoveredTaskIds: [...recoveredIds].sort(), storeRevision: next.revision }
    };
  });
}

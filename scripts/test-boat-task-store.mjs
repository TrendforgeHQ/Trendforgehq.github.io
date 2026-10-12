#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addTaskFindings, checkpointTask, transitionTask } from './boat-task-state.mjs';
import {
  loadTaskStore, recoverInterruptedTasks, submitTaskRequest, updateStoredTask, validateTaskStore
} from './boat-task-store.mjs';

const sha = 'c'.repeat(40);
const request = (overrides = {}) => ({
  schemaVersion: 1,
  taskType: 'published_catalogue_audit',
  pinnedCommitSha: sha,
  batchSize: 10,
  maxBatches: 1,
  budgetLimits: { aiCalls: 0, webRequests: 0 },
  idempotencyKey: 'boat-task-store-key-001',
  ...overrides
});
const t0 = '2026-10-12T10:00:00.000Z';
const t1 = '2026-10-12T10:01:00.000Z';
async function withTempStore(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-task-store-'));
  try { await run(path.join(dir, 'store.json')); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test('request and idempotency claim are committed in one store replacement', async () => withTempStore(async file => {
  const result = await submitTaskRequest(file, request(), { createdAt: t0 });
  assert.equal(result.outcome, 'created');
  const store = await loadTaskStore(file);
  assert.equal(store.tasks.length, 1);
  assert.equal(store.idempotency.length, 1);
  assert.equal(store.idempotency[0].taskId, store.tasks[0].taskId);
  assert.equal(store.revision, 1);
  assert.equal(validateTaskStore(store).valid, true);
}));

test('same request after restart replays original task without another task or revision', async () => withTempStore(async file => {
  const first = await submitTaskRequest(file, request(), { createdAt: t0 });
  const replay = await submitTaskRequest(file, request(), { createdAt: t1 });
  assert.equal(replay.outcome, 'replay');
  assert.equal(replay.task.taskId, first.task.taskId);
  assert.equal(replay.storeRevision, 1);
  const store = await loadTaskStore(file);
  assert.equal(store.tasks.length, 1);
  assert.equal(store.idempotency.length, 1);
  assert.equal(store.revision, 1);
}));

test('reused key with changed request conflicts and preserves exact store bytes', async () => withTempStore(async file => {
  await submitTaskRequest(file, request(), { createdAt: t0 });
  const before = await fs.readFile(file, 'utf8');
  const result = await submitTaskRequest(file, request({ batchSize: 25 }), { createdAt: t1 });
  assert.equal(result.outcome, 'conflict');
  assert.equal(await fs.readFile(file, 'utf8'), before);
}));

test('interrupted running tasks recover to paused with checkpoint preserved and no execution', async () => withTempStore(async file => {
  const created = await submitTaskRequest(file, request(), { createdAt: t0 });
  let store = await loadTaskStore(file);
  const running = transitionTask(created.task, 'running', { updatedAt: t1 });
  const checkpointed = {
    ...running,
    checkpoint: { cursor: 'article:page-3', completedUnits: ['article:a', 'article:b'] },
    revision: running.revision + 1,
    updatedAt: t1
  };
  store = { ...store, revision: store.revision + 1, tasks: [checkpointed] };
  await fs.writeFile(file, JSON.stringify(store, null, 2) + '\n', 'utf8'); // simulate durable state at process death
  const result = await recoverInterruptedTasks(file, { recoveredAt: '2026-10-12T10:05:00.000Z' });
  assert.equal(result.outcome, 'recovered');
  assert.deepEqual(result.recoveredTaskIds, [created.task.taskId]);
  const recovered = await loadTaskStore(file);
  assert.equal(recovered.tasks[0].status, 'paused');
  assert.equal(recovered.tasks[0].checkpoint.cursor, 'article:page-3');
  assert.deepEqual(recovered.tasks[0].checkpoint.completedUnits, ['article:a', 'article:b']);
  assert.match(recovered.tasks[0].errors.at(-1).message, /resume requires explicit operator action/);
  assert.equal((await recoverInterruptedTasks(file, { recoveredAt: '2026-10-12T10:06:00.000Z' })).outcome, 'no_interrupted_tasks');
}));

test('corrupt store, lock contention, and dangling idempotency reference fail closed', async () => withTempStore(async file => {
  await fs.writeFile(file + '.lock', 'operator-held', 'utf8');
  assert.equal((await submitTaskRequest(file, request(), { createdAt: t0 })).outcome, 'locked');
  await fs.rm(file + '.lock');
  await fs.writeFile(file, '{bad json', 'utf8');
  await assert.rejects(() => loadTaskStore(file), /Corrupt BOAT task store/);
  assert.equal(validateTaskStore({ schemaVersion: 1, revision: 1, tasks: [], idempotency: [{ key: 'boat-task-store-key-001', requestHash: 'a'.repeat(64), taskId: 'boat_' + 'f'.repeat(24) }] }).valid, false);
}));

test('invalid request does not create a file or claim', async () => withTempStore(async file => {
  const result = await submitTaskRequest(file, request({ maxBatches: 0 }), { createdAt: t0 });
  assert.equal(result.outcome, 'invalid_request');
  await assert.rejects(() => fs.stat(file), { code: 'ENOENT' });
}));


test('checkpoint and findings advance atomically with compare-and-swap revision protection', async () => withTempStore(async file => {
  const created = await submitTaskRequest(file, request(), { createdAt: t0 });
  const started = transitionTask(created.task, 'running', { updatedAt: t1 });
  const startSave = await updateStoredTask(file, started.taskId, created.task.revision, () => started);
  assert.equal(startSave.outcome, 'updated');
  const finding = { findingId: 'F-' + 'a'.repeat(24), category: 'structure', severity: 'low', status: 'review_signal', title: 'fixture', semanticSupport: 'not_assessed', requiresApproval: true };
  const checkpointed = checkpointTask(addTaskFindings(started, [finding], { updatedAt: t1 }), {
    cursor: 'index:10', completedUnitIds: ['0:alpha', '1:beta'], updatedAt: t1
  });
  const saved = await updateStoredTask(file, started.taskId, started.revision, () => checkpointed);
  assert.equal(saved.outcome, 'updated');
  const persisted = await loadTaskStore(file);
  assert.equal(persisted.tasks[0].checkpoint.cursor, 'index:10');
  assert.deepEqual(persisted.tasks[0].checkpoint.completedUnits, ['0:alpha', '1:beta']);
  assert.equal(persisted.tasks[0].findings.length, 1);
  assert.equal(persisted.revision, 3);

  const before = await fs.readFile(file, 'utf8');
  const stale = await updateStoredTask(file, started.taskId, started.revision, () => checkpointed);
  assert.equal(stale.outcome, 'revision_conflict');
  assert.equal(stale.currentRevision, checkpointed.revision);
  assert.equal(await fs.readFile(file, 'utf8'), before);
}));

test('stored task update rejects an unchanged task revision', async () => withTempStore(async file => {
  const created = await submitTaskRequest(file, request(), { createdAt: t0 });
  const invalid = { ...transitionTask(created.task, 'running', { updatedAt: t1 }), revision: created.task.revision };
  await assert.rejects(() => updateStoredTask(file, created.task.taskId, created.task.revision, () => invalid), /advance the task revision/);
  assert.equal((await loadTaskStore(file)).tasks[0].status, 'queued');
}));

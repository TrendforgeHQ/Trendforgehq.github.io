#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  addTaskFindings, checkpointTask, consumeTaskBudget, createTaskRecord,
  loadTaskRecord, saveTaskRecord, transitionTask, validateTaskRecord
} from './boat-task-state.mjs';

const sha = 'a'.repeat(40);
const t0 = '2026-10-12T08:00:00.000Z';
const t1 = '2026-10-12T08:01:00.000Z';
const create = (extra = {}) => createTaskRecord({ taskType: 'published_catalogue_audit', pinnedCommitSha: sha, createdAt: t0, ...extra });

test('task ID is deterministic and input is pinned to a full commit SHA', () => {
  assert.equal(create().taskId, create({ config: {} }).taskId);
  assert.notEqual(create().taskId, create({ config: { limit: 5 } }).taskId);
  assert.throws(() => createTaskRecord({ taskType: 'published_catalogue_audit', pinnedCommitSha: 'abc', createdAt: t0 }), /full 40-character/);
  assert.equal(validateTaskRecord(create()).valid, true);
});

test('state transitions fail closed and revisions increment', () => {
  const queued = create();
  const running = transitionTask(queued, 'running', { updatedAt: t1 });
  assert.equal(running.revision, 1);
  assert.equal(running.status, 'running');
  assert.throws(() => transitionTask(running, 'queued', { updatedAt: t1 }), /Invalid task transition/);
  assert.throws(() => transitionTask(transitionTask(running, 'completed', { updatedAt: t1 }), 'running', { updatedAt: t1 }), /Invalid task transition/);
});

test('checkpoints merge completed unit IDs idempotently and only while active', () => {
  const running = transitionTask(create(), 'running', { updatedAt: t1 });
  const once = checkpointTask(running, { cursor: 'page:2', completedUnitIds: ['article:a', 'article:b'], updatedAt: t1 });
  const twice = checkpointTask(once, { cursor: 'page:2', completedUnitIds: ['article:b', 'article:c'], updatedAt: t1 });
  assert.deepEqual(twice.checkpoint.completedUnits, ['article:a', 'article:b', 'article:c']);
  assert.equal(twice.checkpoint.cursor, 'page:2');
  assert.throws(() => checkpointTask(create(), { completedUnitIds: ['x'], updatedAt: t1 }), /requires a running or paused/);
});

test('findings are deduplicated and conflicting duplicate IDs are rejected', () => {
  const running = transitionTask(create(), 'running', { updatedAt: t1 });
  const finding = { findingId: 'F-1', severity: 'low', title: 'Missing description' };
  const one = addTaskFindings(running, [finding], { updatedAt: t1 });
  const two = addTaskFindings(one, [finding, finding], { updatedAt: t1 });
  assert.equal(two.findings.length, 1);
  assert.throws(() => addTaskFindings(two, [{ ...finding, severity: 'high' }], { updatedAt: t1 }), /Conflicting payload/);
});

test('AI and web budgets are closed by default and cannot be exceeded', () => {
  const running = transitionTask(create(), 'running', { updatedAt: t1 });
  assert.throws(() => consumeTaskBudget(running, 'aiCalls', 1, { updatedAt: t1 }), /budget exhausted/);
  const allowed = transitionTask(create({ budgetLimits: { aiCalls: 2, webRequests: 1 } }), 'running', { updatedAt: t1 });
  const used = consumeTaskBudget(allowed, 'aiCalls', 2, { updatedAt: t1 });
  assert.equal(used.budget.aiCalls, 2);
  assert.throws(() => consumeTaskBudget(used, 'aiCalls', 1, { updatedAt: t1 }), /budget exhausted/);
});

test('local state round-trips and optimistic revision rejects stale writers', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-state-'));
  try {
    const file = path.join(dir, 'task.json');
    const queued = create();
    await saveTaskRecord(file, queued, { expectedRevision: null });
    const loaded = await loadTaskRecord(file);
    assert.deepEqual(loaded, queued);
    const running = transitionTask(loaded, 'running', { updatedAt: t1 });
    await saveTaskRecord(file, running, { expectedRevision: 0 });
    await assert.rejects(() => saveTaskRecord(file, queued, { expectedRevision: 0 }), /state conflict/);
    assert.equal((await loadTaskRecord(file)).status, 'running');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('corrupt state and existing lock fail closed', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-state-'));
  try {
    const file = path.join(dir, 'task.json');
    await fs.writeFile(file, '{broken', 'utf8');
    await assert.rejects(() => loadTaskRecord(file), /Corrupt BOAT task JSON/);
    await fs.rm(file);
    await fs.writeFile(file + '.lock', 'operator-held', 'utf8');
    await assert.rejects(() => saveTaskRecord(file, create(), { expectedRevision: null }), /locked by another writer/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('failed persistence leaves the prior task bytes intact', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-state-'));
  try {
    const file = path.join(dir, 'task.json');
    const queued = create();
    await saveTaskRecord(file, queued, { expectedRevision: null });
    const original = await fs.readFile(file, 'utf8');
    const changed = transitionTask(queued, 'running', { updatedAt: t1 });
    await assert.rejects(() => saveTaskRecord(file, changed, { expectedRevision: 99 }), /state conflict/);
    assert.equal(await fs.readFile(file, 'utf8'), original);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('task lifecycle permits only documented transitions and keeps completed terminal', () => {
  const queued = create();
  const running = transitionTask(queued, 'running', { updatedAt: t1 });
  const paused = transitionTask(running, 'paused', { updatedAt: t1 });
  const resumed = transitionTask(paused, 'running', { updatedAt: t1 });
  const review = transitionTask(resumed, 'needs_review', { updatedAt: t1 });
  const reviewed = transitionTask(review, 'completed', { updatedAt: t1 });
  assert.equal(reviewed.status, 'completed');
  assert.throws(() => transitionTask(reviewed, 'queued', { updatedAt: t1 }), /Invalid task transition/);
  assert.throws(() => transitionTask(reviewed, 'running', { updatedAt: t1 }), /Invalid task transition/);
  const blocked = transitionTask(queued, 'blocked', { updatedAt: t1, reason: 'policy denied' });
  assert.equal(transitionTask(blocked, 'queued', { updatedAt: t1 }).status, 'queued');
  const failed = transitionTask(running, 'failed', { updatedAt: t1, reason: 'local I/O failed' });
  assert.equal(transitionTask(failed, 'queued', { updatedAt: t1 }).status, 'queued');
  assert.throws(() => transitionTask(queued, 'paused', { updatedAt: t1 }), /Invalid task transition/);
});

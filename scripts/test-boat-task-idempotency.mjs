#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  claimIdempotencyKey, createEmptyIdempotencyLedger, loadIdempotencyLedger,
  resolveIdempotency, validateIdempotencyLedger
} from './boat-task-idempotency.mjs';

const sha = 'a'.repeat(40);
const request = (overrides = {}) => ({
  schemaVersion: 1,
  taskType: 'published_catalogue_audit',
  pinnedCommitSha: sha,
  batchSize: 10,
  maxBatches: 1,
  budgetLimits: { aiCalls: 0, webRequests: 0 },
  idempotencyKey: 'boat-idempotency-key-01',
  ...overrides
});
const taskA = 'boat_' + 'a'.repeat(24);
const taskB = 'boat_' + 'b'.repeat(24);
const t0 = '2026-10-12T09:00:00.000Z';

test('empty ledger is valid and pure claim increments revision once', () => {
  const empty = createEmptyIdempotencyLedger();
  assert.deepEqual(validateIdempotencyLedger(empty), { valid: true, errors: [] });
  const first = resolveIdempotency(empty, request(), taskA, { createdAt: t0 });
  assert.equal(first.outcome, 'created');
  assert.equal(first.ledger.revision, 1);
  assert.equal(first.ledger.entries.length, 1);
});

test('same key and semantically identical request returns original task ID', () => {
  const first = resolveIdempotency(createEmptyIdempotencyLedger(), request(), taskA, { createdAt: t0 });
  const reordered = request({ budgetLimits: { webRequests: 0, aiCalls: 0 } });
  const replay = resolveIdempotency(first.ledger, reordered, taskB, { createdAt: t0 });
  assert.equal(replay.outcome, 'replay');
  assert.equal(replay.taskId, taskA);
  assert.equal(replay.ledger.revision, 1);
});

test('same key with a changed request is a conflict, not a second task', () => {
  const first = resolveIdempotency(createEmptyIdempotencyLedger(), request(), taskA, { createdAt: t0 });
  const changed = resolveIdempotency(first.ledger, request({ batchSize: 25 }), taskB, { createdAt: t0 });
  assert.equal(changed.outcome, 'conflict');
  assert.equal(changed.code, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');
  assert.equal(first.ledger.entries.length, 1);
});

test('different keys can create distinct claims and invalid inputs fail closed', () => {
  const first = resolveIdempotency(createEmptyIdempotencyLedger(), request(), taskA, { createdAt: t0 });
  const second = resolveIdempotency(first.ledger, request({ idempotencyKey: 'boat-idempotency-key-02' }), taskB, { createdAt: t0 });
  assert.equal(second.outcome, 'created');
  assert.equal(second.ledger.revision, 2);
  assert.equal(resolveIdempotency(first.ledger, request({ batchSize: 0 }), taskB, { createdAt: t0 }).outcome, 'invalid_request');
  assert.equal(resolveIdempotency(first.ledger, request(), 'wrong-id', { createdAt: t0 }).outcome, 'invalid_task_id');
});

test('file-backed claim persists across reload and returns original task after restart', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-idempotency-'));
  try {
    const file = path.join(dir, 'idempotency.json');
    const first = await claimIdempotencyKey(file, request(), taskA, { createdAt: t0 });
    assert.equal(first.outcome, 'created');
    assert.equal(first.revision, 1);
    const loaded = await loadIdempotencyLedger(file);
    assert.equal(loaded.entries[0].taskId, taskA);
    const replay = await claimIdempotencyKey(file, request(), taskB, { createdAt: t0 });
    assert.equal(replay.outcome, 'replay');
    assert.equal(replay.taskId, taskA);
    assert.equal((await loadIdempotencyLedger(file)).revision, 1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('file-backed claim rejects changed request and does not mutate prior bytes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-idempotency-'));
  try {
    const file = path.join(dir, 'idempotency.json');
    await claimIdempotencyKey(file, request(), taskA, { createdAt: t0 });
    const before = await fs.readFile(file, 'utf8');
    const conflict = await claimIdempotencyKey(file, request({ maxBatches: 2 }), taskB, { createdAt: t0 });
    assert.equal(conflict.outcome, 'conflict');
    assert.equal(await fs.readFile(file, 'utf8'), before);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('locked, corrupt, and malformed ledgers fail closed', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-idempotency-'));
  try {
    const file = path.join(dir, 'idempotency.json');
    await fs.writeFile(file + '.lock', 'held', 'utf8');
    assert.equal((await claimIdempotencyKey(file, request(), taskA, { createdAt: t0 })).outcome, 'locked');
    await fs.rm(file + '.lock');
    await fs.writeFile(file, '{broken', 'utf8');
    await assert.rejects(() => loadIdempotencyLedger(file), /Corrupt BOAT idempotency ledger/);
    assert.equal(validateIdempotencyLedger({ schemaVersion: 1, revision: 1, entries: [] }).valid, true);
    assert.equal(validateIdempotencyLedger({ schemaVersion: 1, revision: 0, entries: [{ idempotencyKey: 'duplicate-key-0001', requestHash: 'x', taskId: taskA, createdAt: t0 }] }).valid, false);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

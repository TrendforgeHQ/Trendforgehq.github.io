#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/boat-run-catalogue-task.mjs');
const commit = 'b'.repeat(40);
function run(args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 30000 });
}

test('catalogue task pauses after a bounded batch and resumes to completion without external calls', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-catalogue-task-'));
  try {
    const first = run(['--commit', commit, '--state-dir', dir, '--batch-size', '10', '--max-batches', '1']);
    assert.equal(first.status, 0, first.stderr);
    const paused = JSON.parse(first.stdout);
    assert.equal(paused.status, 'paused');
    assert.equal(paused.progress.completedUnits, 10);
    assert.equal(paused.budget.aiCalls, 0);
    assert.equal(paused.budget.webRequests, 0);
    assert.ok(paused.taskId.startsWith('boat_'));
    const resume = run(['--commit', commit, '--state-dir', dir, '--batch-size', '10', '--resume', paused.taskId]);
    assert.equal(resume.status, 0, resume.stderr);
    const completed = JSON.parse(resume.stdout);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.progress.completedUnits, completed.progress.totalArticles);
    assert.equal(completed.pinnedCommitSha, commit);
    assert.ok(completed.findings >= paused.findings);
    assert.ok(completed.limitations.some(item => item.includes('semantic support')));
    const stored = JSON.parse(await fs.readFile(path.join(dir, paused.taskId + '.json'), 'utf8'));
    assert.equal(stored.status, 'completed');
    assert.equal(stored.budget.aiCalls, 0);
    assert.equal(stored.budget.webRequests, 0);
    const repeat = run(['--commit', commit, '--state-dir', dir, '--batch-size', '10', '--resume', paused.taskId]);
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.equal(JSON.parse(repeat.stdout).status, 'completed');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('resume refuses a different pinned commit or changed batch configuration', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-catalogue-task-'));
  try {
    const first = run(['--commit', commit, '--state-dir', dir, '--batch-size', '10', '--max-batches', '1']);
    assert.equal(first.status, 0, first.stderr);
    const taskId = JSON.parse(first.stdout).taskId;
    const wrongSha = run(['--commit', 'c'.repeat(40), '--state-dir', dir, '--batch-size', '10', '--resume', taskId]);
    assert.notEqual(wrongSha.status, 0);
    assert.match(wrongSha.stderr, /does not match pinned commit/);
    const wrongBatch = run(['--commit', commit, '--state-dir', dir, '--batch-size', '11', '--resume', taskId]);
    assert.notEqual(wrongBatch.status, 0);
    assert.match(wrongBatch.stderr, /configuration differs/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('invalid arguments fail before creating a task', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-catalogue-task-'));
  try {
    const result = run(['--commit', 'bad', '--state-dir', dir]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /full 40-character/);
    assert.deepEqual(await fs.readdir(dir), []);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

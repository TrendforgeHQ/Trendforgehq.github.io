#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createTaskRecord, saveTaskRecord, transitionTask } from './boat-task-state.mjs';
import { loadTaskStore } from './boat-task-store.mjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/boat-run-catalogue-task.mjs');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
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
    assert.ok(paused.reportFile.endsWith('.md'));
    const pausedMarkdown = await fs.readFile(paused.reportFile, 'utf8');
    assert.match(pausedMarkdown, /BOAT Editorial Task Report/);
    assert.match(pausedMarkdown, /paused/i);
    const resume = run(['--commit', commit, '--state-dir', dir, '--batch-size', '10', '--resume', paused.taskId]);
    assert.equal(resume.status, 0, resume.stderr);
    const completed = JSON.parse(resume.stdout);
    assert.equal(completed.status, 'completed');
    assert.match(await fs.readFile(completed.reportFile, 'utf8'), /completed/i);
    assert.equal(completed.progress.completedUnits, completed.progress.totalArticles);
    assert.equal(completed.pinnedCommitSha, commit);
    assert.ok(completed.findings >= paused.findings);
    assert.ok(completed.limitations.some(item => item.includes('semantic support')));
    assert.equal(completed.auditComponents.structuralArticles, completed.progress.totalArticles);
    assert.equal(completed.auditComponents.evidenceArticles, completed.progress.totalArticles);
    assert.equal(completed.auditComponents.lineageArticles, completed.progress.totalArticles);
    assert.equal(completed.auditComponents.reviewQueueArticles, completed.progress.totalArticles);
    assert.equal(completed.auditComponents.claimAuditArticles, completed.progress.totalArticles);
    assert.equal(Object.values(completed.findingsByCategory).reduce((sum, count) => sum + count, 0), completed.findings);
    assert.ok(Object.values(completed.findingsByCategory).every(count => Number.isInteger(count) && count >= 0));
    assert.ok(completed.limitations.some(item => item.includes('historical verifier results are signals only')));
    assert.equal(completed.auditComponents.reviewQueueReadOnly, true);
    assert.equal(completed.auditComponents.automaticRepair, false);
    assert.equal(completed.auditComponents.automaticPublicationDecision, false);
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
    assert.match(wrongSha.stderr, /must equal the checked-out repository commit SHA/);
    const forged = createTaskRecord({ taskType: 'published_catalogue_audit', pinnedCommitSha: 'c'.repeat(40), config: { batchSize: 10, totalArticles: 1, auditVersion: 3, auditProfile: 'combined-structural-evidence-lineage-claim-history', auditComponents: {} } });
    await saveTaskRecord(path.join(dir, forged.taskId + '.json'), forged, { expectedRevision: null });
    const mismatchedRecord = run(['--commit', commit, '--state-dir', dir, '--batch-size', '10', '--resume', forged.taskId]);
    assert.notEqual(mismatchedRecord.status, 0);
    assert.match(mismatchedRecord.stderr, /does not match pinned commit/);
    const wrongBatch = run(['--commit', commit, '--state-dir', dir, '--batch-size', '11', '--resume', taskId]);
    assert.notEqual(wrongBatch.status, 0);
    assert.match(wrongBatch.stderr, /differs from original task configuration/);
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


test('combined audit records historical claim signals without claiming current semantic verification', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-combined-audit-'));
  try {
    const result = run(['--commit', commit, '--state-dir', dir, '--batch-size', '100']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'completed');
    assert.equal(report.auditComponents.structuralArticles, report.progress.totalArticles);
    assert.equal(report.auditComponents.evidenceArticles, report.progress.totalArticles);
    assert.equal(report.auditComponents.lineageArticles, report.progress.totalArticles);
    assert.equal(report.auditComponents.reviewQueueArticles, report.progress.totalArticles);
    assert.equal(report.auditComponents.claimAuditArticles, report.progress.totalArticles);
    assert.ok(report.limitations.some(item => item.includes('historical verifier results are signals only')));
    assert.equal(report.auditComponents.reviewQueueReadOnly, true);
    assert.equal(report.auditComponents.automaticRepair, false);
    assert.equal(report.auditComponents.automaticPublicationDecision, false);
    const state = JSON.parse(await fs.readFile(path.join(dir, report.taskId + '.json'), 'utf8'));
    assert.ok(state.findings.every(item => item.semanticSupport === 'not_assessed' || item.semanticSupport === 'unknown'));
    assert.ok(state.findings.every(item => item.requiresApproval === true));
    assert.ok(state.findings.some(item => item.category === 'claim_history') || report.auditComponents.archivedClaimRows === 0);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('store-backed runner resumes from canonical store, skips completed units, and repairs stale artifact snapshots', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-catalogue-store-adapter-'));
  const storePath = path.join(dir, 'canonical-store.json');
  const stateDir = path.join(dir, 'artifacts');
  try {
    const first = run(['--commit', commit, '--state-dir', stateDir, '--task-store', storePath, '--batch-size', '10', '--max-batches', '1']);
    assert.equal(first.status, 0, first.stderr);
    const paused = JSON.parse(first.stdout);
    assert.equal(paused.status, 'paused');
    assert.equal(paused.articlesProcessedThisInvocation, 10);
    let store = await loadTaskStore(storePath);
    assert.equal(store.tasks.length, 1);
    assert.equal(store.idempotency.length, 1);
    assert.equal(store.tasks[0].taskId, paused.taskId);
    assert.equal(store.tasks[0].checkpoint.completedUnits.length, 10);

    let canonicalTask = transitionTask(store.tasks[0], 'running', { reason: 'test fixture simulates interrupted worker' });
    store = { ...store, revision: store.revision + 1, tasks: store.tasks.map(task => task.taskId === paused.taskId ? canonicalTask : task) };
    await fs.writeFile(storePath, JSON.stringify(store, null, 2) + '\n', 'utf8');
    const stalePath = path.join(stateDir, paused.taskId + '.json');
    const stale = JSON.parse(await fs.readFile(stalePath, 'utf8'));
    stale.checkpoint = { cursor: 'index:0', completedUnits: [] };
    stale.findings = [];
    stale.status = 'paused';
    await fs.writeFile(stalePath, JSON.stringify(stale, null, 2) + '\n', 'utf8');

    const resumed = run(['--commit', commit, '--state-dir', stateDir, '--task-store', storePath, '--batch-size', '10', '--resume', paused.taskId]);
    assert.equal(resumed.status, 0, resumed.stderr);
    const completed = JSON.parse(resumed.stdout);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.articlesProcessedThisInvocation, completed.progress.totalArticles - 10);
    assert.equal(completed.progress.completedUnits, completed.progress.totalArticles);
    assert.equal(completed.budget.aiCalls, 0);
    assert.equal(completed.budget.webRequests, 0);

    store = await loadTaskStore(storePath);
    assert.equal(store.tasks.length, 1);
    assert.equal(store.idempotency.length, 1);
    const saved = store.tasks[0];
    assert.equal(saved.status, 'completed');
    assert.equal(saved.checkpoint.completedUnits.length, completed.progress.totalArticles);
    assert.equal(new Set(saved.checkpoint.completedUnits).size, saved.checkpoint.completedUnits.length);
    assert.equal(new Set(saved.findings.map(item => item.findingId)).size, saved.findings.length);
    assert.deepEqual(JSON.parse(await fs.readFile(stalePath, 'utf8')), saved);
    assert.match(await fs.readFile(completed.reportFile, 'utf8'), /completed/i);

    const reportBytes = await fs.readFile(completed.reportFile, 'utf8');
    const repeat = run(['--commit', commit, '--state-dir', stateDir, '--task-store', storePath, '--batch-size', '10', '--resume', paused.taskId]);
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.equal(JSON.parse(repeat.stdout).articlesProcessedThisInvocation, 0);
    assert.equal(await fs.readFile(completed.reportFile, 'utf8'), reportBytes);
    assert.deepEqual((await fs.readdir(stateDir)).filter(name => name === paused.taskId + '.md'), [paused.taskId + '.md']);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('store-backed resume fails closed if only a stale task artifact exists', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-catalogue-store-missing-'));
  try {
    const stateDir = path.join(dir, 'artifacts');
    const first = run(['--commit', commit, '--state-dir', stateDir, '--batch-size', '10', '--max-batches', '1']);
    assert.equal(first.status, 0, first.stderr);
    const taskId = JSON.parse(first.stdout).taskId;
    const storePath = path.join(dir, 'empty-store.json');
    const resume = run(['--commit', commit, '--state-dir', stateDir, '--task-store', storePath, '--batch-size', '10', '--resume', taskId]);
    assert.notEqual(resume.status, 0);
    assert.match(resume.stderr, /canonical task store has no matching task/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

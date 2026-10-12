import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTaskRecord } from './boat-task-state.mjs';
import { createEmptyTaskStore } from './boat-task-store.mjs';
import { createPortableTaskStoreArtifact, validatePortableTaskStoreArtifact, importPortableTaskStoreArtifact } from './boat-task-store-artifact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = 'a'.repeat(40);
const runId = '38232459006';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const stable = value => JSON.stringify(canonical(value));
function fixture() {
  const task = createTaskRecord({
    taskType: 'published_catalogue_audit', pinnedCommitSha: commit, createdAt: '2026-10-12T09:00:00.000Z',
    config: { auditVersion: 3, auditProfile: 'combined-structural-evidence-lineage-claim-history', batchSize: 10, totalArticles: 48, auditComponents: { structural: 48, evidence: 48, lineage: 48 } }
  });
  const running = { ...task, status: 'paused', revision: 3, updatedAt: '2026-10-12T09:03:00.000Z',
    checkpoint: { cursor: 'index:20', completedUnits: ['0:one','1:two','2:three'] },
    findings: [{ findingId: 'F-' + 'a'.repeat(24), category: 'structure', severity: 'low', status: 'review_signal', title: 'fixture', semanticSupport: 'not_assessed', requiresApproval: true }]
  };
  const requestHash = hash(stable({ taskType: running.taskType, pinnedCommitSha: running.pinnedCommitSha, config: running.config }));
  const store = { ...createEmptyTaskStore(), revision: 4, tasks: [running], idempotency: [{ key: 'catalogue-audit:' + running.taskId, requestHash, taskId: running.taskId }] };
  return { task: running, store, storeText: JSON.stringify(store, null, 2) + '\n' };
}
function exported(f = fixture()) {
  return createPortableTaskStoreArtifact({ storeText: f.storeText, sourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit });
}
function validate(f, art, overrides = {}) {
  return validatePortableTaskStoreArtifact({
    storeText: art.portableStoreText, manifestText: art.manifestText,
    expectedSourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit, ...overrides
  });
}

test('portable task-store artifact round-trips the exact paused checkpoint and idempotency claim', async () => {
  const f = fixture(), art = exported(f);
  assert.equal(art.portableStore.tasks.length, 1);
  assert.equal(art.portableStore.idempotency.length, 1);
  assert.equal(art.portableStore.tasks[0].checkpoint.cursor, 'index:20');
  assert.deepEqual(art.portableStore.tasks[0].checkpoint.completedUnits, ['0:one','1:two','2:three']);
  assert.deepEqual(validate(f, art), { valid: true, sourceRunId: runId, taskId: f.task.taskId, pinnedCommitSha: commit, status: 'paused', storeRevision: 4, taskCount: 1, idempotencyClaimCount: 1 });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-store-portable-'));
  try {
    const destination = path.join(dir, 'restored-store.json');
    const result = await importPortableTaskStoreArtifact({ storeText: art.portableStoreText, manifestText: art.manifestText, destinationPath: destination, expectedSourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit });
    const restored = JSON.parse(await fs.readFile(destination, 'utf8'));
    assert.equal(result.status, 'paused');
    assert.deepEqual(restored, art.portableStore);
    assert.equal(restored.tasks[0].budget.aiCalls, 0);
    assert.equal(restored.tasks[0].budget.webRequests, 0);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('artifact rejects wrong run, task ID, commit, store bytes, and manifest tampering', () => {
  const f = fixture(), art = exported(f);
  assert.throws(() => validate(f, art, { expectedSourceRunId: '38232459007' }), /source run ID mismatch/);
  assert.throws(() => validate(f, art, { expectedTaskId: 'boat_' + 'b'.repeat(24) }), /task ID mismatch/);
  assert.throws(() => validate(f, art, { expectedCommitSha: 'c'.repeat(40) }), /pinned commit mismatch/);
  assert.throws(() => validatePortableTaskStoreArtifact({ storeText: art.portableStoreText + ' ', manifestText: art.manifestText, expectedSourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /bytes hash mismatch/);
  const changedManifest = JSON.parse(art.manifestText); changedManifest.storeSha256 = 'f'.repeat(64);
  assert.throws(() => validatePortableTaskStoreArtifact({ storeText: art.portableStoreText, manifestText: JSON.stringify(changedManifest), expectedSourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /bytes hash mismatch/);
});

test('artifact rejects corrupt store, bad idempotency mapping, unsupported profile and invalid status', () => {
  const f = fixture(), art = exported(f);
  const broken = JSON.parse(art.portableStoreText); broken.idempotency[0].requestHash = '0'.repeat(64);
  const bad = JSON.stringify(broken, null, 2) + '\n';
  const manifest = JSON.stringify({ ...art.manifest, storeSha256: hash(bad), taskRecordSha256: hash(JSON.stringify(broken.tasks[0], null, 2) + '\n') });
  assert.throws(() => validatePortableTaskStoreArtifact({ storeText: bad, manifestText: manifest, expectedSourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /idempotency claim mismatch/);
  const wrongProfile = JSON.parse(f.storeText); wrongProfile.tasks[0].config.auditProfile = 'other';
  assert.throws(() => createPortableTaskStoreArtifact({ storeText: JSON.stringify(wrongProfile), sourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /profile\/version/);
  const invalidStatus = JSON.parse(f.storeText); invalidStatus.tasks[0].status = 'blocked';
  assert.throws(() => createPortableTaskStoreArtifact({ storeText: JSON.stringify(invalidStatus), sourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /not eligible/);
  assert.throws(() => createPortableTaskStoreArtifact({ storeText: '{bad json', sourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /not valid JSON/);
});

test('import never overwrites or merges an existing destination store', async () => {
  const f = fixture(), art = exported(f), dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-store-no-overwrite-'));
  try {
    const destination = path.join(dir, 'existing.json');
    await fs.writeFile(destination, 'operator state');
    await assert.rejects(() => importPortableTaskStoreArtifact({ storeText: art.portableStoreText, manifestText: art.manifestText, destinationPath: destination, expectedSourceRunId: runId, expectedTaskId: f.task.taskId, expectedCommitSha: commit }), /Refusing to overwrite or merge/);
    assert.equal(await fs.readFile(destination, 'utf8'), 'operator state');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('CLI creates, validates and imports a portable store artifact without overwriting inputs', async () => {
  const f = fixture(), dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-store-cli-'));
  try {
    const store = path.join(dir, 'store.json'), manifest = path.join(dir, 'manifest.json'), imported = path.join(dir, 'imported.json');
    await fs.writeFile(store, f.storeText);
    const script = path.join(root, 'scripts/boat-task-store-artifact.mjs');
    const args = ['--store',store,'--manifest',manifest,'--run-id',runId,'--task-id',f.task.taskId,'--commit',commit];
    const create = spawnSync(process.execPath, [script,'--mode','create',...args], { encoding: 'utf8' });
    assert.equal(create.status, 0, create.stderr);
    const art = exported(f);
    await fs.writeFile(store, art.portableStoreText);
    const validateResult = spawnSync(process.execPath, [script,'--mode','validate',...args], { encoding: 'utf8' });
    assert.equal(validateResult.status, 0, validateResult.stderr);
    assert.equal(JSON.parse(validateResult.stdout).valid, true);
    const importResult = spawnSync(process.execPath, [script,'--mode','import',...args,'--output',imported], { encoding: 'utf8' });
    assert.equal(importResult.status, 0, importResult.stderr);
    assert.equal(JSON.parse(importResult.stdout).imported, true);
    assert.deepEqual(JSON.parse(await fs.readFile(imported,'utf8')), art.portableStore);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

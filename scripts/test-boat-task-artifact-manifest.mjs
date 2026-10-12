import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTaskRecord } from './boat-task-state.mjs';
import { createCheckpointManifest, validateCheckpointManifest } from './boat-task-artifact-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = 'a'.repeat(40);
const runId = '38225022261';
const taskRecord = () => createTaskRecord({
  taskType: 'published_catalogue_audit',
  pinnedCommitSha: commit,
  createdAt: '2026-10-12T10:00:00.000Z',
  config: {
    auditVersion: 3,
    auditProfile: 'combined-structural-evidence-lineage-claim-history',
    batchSize: 10,
    totalArticles: 100,
    auditComponents: { structural: 100, evidence: 100, lineage: 100 }
  }
});
const serialized = record => JSON.stringify(record, null, 2) + '\n';
const report = '# BOAT Editorial Task Report\n\nRead-only report.\n';
function fixture() {
  const text = serialized(taskRecord());
  const record = JSON.parse(text);
  const manifest = createCheckpointManifest({ taskRecordText: text, reportText: report, sourceRunId: runId, expectedTaskId: record.taskId });
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  return { text, record, manifest, manifestText };
}

test('checkpoint manifest binds task, run, commit, config, and exact report bytes', () => {
  const f = fixture();
  assert.deepEqual(validateCheckpointManifest({
    manifestText: f.manifestText,
    taskRecordText: f.text,
    reportText: report,
    expectedTaskId: f.record.taskId,
    expectedSourceRunId: runId,
    expectedCommitSha: commit
  }), {
    valid: true,
    taskId: f.record.taskId,
    sourceRunId: runId,
    pinnedCommitSha: commit,
    status: 'queued'
  });
});

test('checkpoint manifest fails closed for wrong prior run, task ID, or commit', () => {
  const f = fixture();
  const validate = overrides => validateCheckpointManifest({
    manifestText: f.manifestText,
    taskRecordText: f.text,
    reportText: report,
    expectedTaskId: f.record.taskId,
    expectedSourceRunId: runId,
    expectedCommitSha: commit,
    ...overrides
  });
  assert.throws(() => validate({ expectedSourceRunId: '38225022262' }), /source run ID/);
  assert.throws(() => validate({ expectedTaskId: 'boat_' + 'b'.repeat(24) }), /task ID mismatch/);
  assert.throws(() => validate({ expectedCommitSha: 'c'.repeat(40) }), /pinned commit/);
});

test('checkpoint manifest rejects task-record or report byte tampering', () => {
  const f = fixture();
  assert.throws(() => validateCheckpointManifest({
    manifestText: f.manifestText,
    taskRecordText: f.text.replace('"status": "queued"', '"status": "paused"'),
    reportText: report,
    expectedTaskId: f.record.taskId,
    expectedSourceRunId: runId,
    expectedCommitSha: commit
  }), /task-record hash mismatch/);
  assert.throws(() => validateCheckpointManifest({
    manifestText: f.manifestText,
    taskRecordText: f.text,
    reportText: report + 'tampered',
    expectedTaskId: f.record.taskId,
    expectedSourceRunId: runId,
    expectedCommitSha: commit
  }), /report hash mismatch/);
  assert.throws(() => validateCheckpointManifest({
    manifestText: f.manifestText,
    taskRecordText: f.text,
    reportText: null,
    expectedTaskId: f.record.taskId,
    expectedSourceRunId: runId,
    expectedCommitSha: commit
  }), /report hash mismatch or report missing/);
});

test('checkpoint manifest refuses unsupported profile and non-resumable task state', () => {
  const badProfile = taskRecord();
  badProfile.config.auditProfile = 'unknown-profile';
  assert.throws(() => createCheckpointManifest({
    taskRecordText: serialized(badProfile),
    reportText: report,
    sourceRunId: runId,
    expectedTaskId: badProfile.taskId
  }), /profile\/version/);

  const blocked = taskRecord();
  blocked.status = 'blocked';
  assert.throws(() => createCheckpointManifest({
    taskRecordText: serialized(blocked),
    reportText: report,
    sourceRunId: runId,
    expectedTaskId: blocked.taskId
  }), /not resumable/);
});

test('manifest CLI creates and validates a portable checkpoint manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-artifact-manifest-'));
  try {
    const f = fixture();
    fs.writeFileSync(path.join(dir, f.record.taskId + '.json'), f.text);
    fs.writeFileSync(path.join(dir, f.record.taskId + '.md'), report);
    const script = path.join(root, 'scripts', 'boat-task-artifact-manifest.mjs');
    const create = spawnSync(process.execPath, [script, '--mode', 'create', '--state-dir', dir, '--run-id', runId, '--task-id', f.record.taskId], { encoding: 'utf8' });
    assert.equal(create.status, 0, create.stderr);
    assert.equal(JSON.parse(create.stdout).valid, true);
    const validate = spawnSync(process.execPath, [script, '--mode', 'validate', '--state-dir', dir, '--run-id', runId, '--task-id', f.record.taskId, '--commit', commit], { encoding: 'utf8' });
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(JSON.parse(validate.stdout).valid, true);
    const wrongRun = spawnSync(process.execPath, [script, '--mode', 'validate', '--state-dir', dir, '--run-id', '38225022262', '--task-id', f.record.taskId, '--commit', commit], { encoding: 'utf8' });
    assert.notEqual(wrongRun.status, 0);
    assert.match(wrongRun.stderr, /source run ID/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

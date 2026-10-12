import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createTaskRecord, transitionTask, addTaskFindings, saveTaskRecord } from './boat-task-state.mjs';
import { renderTaskReport } from './boat-render-task-report.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = path.join(root, 'scripts/boat-render-task-report.mjs');
const sha = 'd'.repeat(40);

test('human report is deterministic, escaped, and preserves explicit uncertainty', () => {
  const queued = createTaskRecord({ taskType: 'published_catalogue_audit', pinnedCommitSha: sha, createdAt: '2026-10-12T08:00:00.000Z', config: { totalArticles: 2, auditProfile: 'combined-structural-evidence-lineage-claim-history', auditComponents: { automaticRepair: false, automaticPublicationDecision: false } } });
  const running = transitionTask(queued, 'running', { updatedAt: '2026-10-12T08:01:00.000Z' });
  const withFinding = addTaskFindings(running, [{ findingId: 'F-1', category: 'claim_history', severity: 'high', status: 'review_required', articleSlug: 'alpha', articleTitle: 'Alpha | article', title: 'Unsupported claim', description: 'Needs review <script>alert(1)</script> **literal**', semanticSupport: 'not_assessed', requiresApproval: true, claim: { text: 'Claim with | delimiter', savedVerifierStatus: 'unsupported', currentArticleTextStatus: 'not-exactly-found-possible-version-or-segmentation-difference', currentArticleSha256: 'a'.repeat(64), report: { attemptId: 'run-1', reportSha256: 'b'.repeat(64), historicalPass: false }, source: { title: 'Source', url: 'https://example.com' }, passages: [{ id: 'P1', excerpt: 'Saved excerpt' }] } }], { updatedAt: '2026-10-12T08:02:00.000Z' });
  const first = renderTaskReport(withFinding);
  const second = renderTaskReport(withFinding);
  assert.equal(first, second);
  assert.match(first, /Automatic repair:\*\* disabled/);
  assert.match(first, /not assessed/);
  assert.match(first, /a{64}/);
  assert.match(first, /b{64}/);
  assert.match(first, /Claim with \\\| delimiter/);
  assert.match(first, /not independently verify source reachability/);
  assert.doesNotMatch(first, /<script>/);
  assert.match(first, /&lt;script&gt;/);
});

test('CLI renders to stdout or an atomic Markdown file and refuses to overwrite task JSON', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boat-report-'));
  try {
    const statePath = path.join(dir, 'task.json');
    const record = createTaskRecord({ taskType: 'published_catalogue_audit', pinnedCommitSha: sha, createdAt: '2026-10-12T08:00:00.000Z', config: { totalArticles: 0 } });
    await saveTaskRecord(statePath, record, { expectedRevision: null });
    const stdout = spawnSync(process.execPath, [script, statePath], { encoding: 'utf8' });
    assert.equal(stdout.status, 0, stdout.stderr);
    assert.match(stdout.stdout, /BOAT Editorial Task Report/);
    const reportPath = path.join(dir, 'report.md');
    const output = spawnSync(process.execPath, [script, statePath, '--output', reportPath], { encoding: 'utf8' });
    assert.equal(output.status, 0, output.stderr);
    assert.equal(await fs.readFile(reportPath, 'utf8'), stdout.stdout);
    const before = await fs.readFile(statePath, 'utf8');
    const overwrite = spawnSync(process.execPath, [script, statePath, '--output', statePath], { encoding: 'utf8' });
    assert.notEqual(overwrite.status, 0);
    assert.match(overwrite.stderr, /must not overwrite/);
    assert.equal(await fs.readFile(statePath, 'utf8'), before);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

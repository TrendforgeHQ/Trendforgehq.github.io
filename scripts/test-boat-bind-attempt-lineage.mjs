import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { bindAttemptLineage } from './boat-bind-attempt-lineage.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-bind-lineage-'));
try {
  const data = path.join(tempRoot, 'data');
  const articlePath = path.join(tempRoot, 'content', 'articles', 'example.md');
  const attempt = path.join(data, 'article-attempts', '20261011-example');
  fs.mkdirSync(path.dirname(articlePath), { recursive: true });
  fs.mkdirSync(attempt, { recursive: true });
  const originalArticle = '---\ntitle: "Example published article"\n---\nOriginal generated draft.\n';
  const finalArticle = '---\ntitle: "Example published article"\n---\nFinal repaired article.\n';
  const report = { generatedAt: '2026-10-11T02:00:00.000Z', articlePath: 'content/articles/example.md', articleTitle: 'Example published article', pass: true, claims: [{ index: 1, claim: 'A claim', status: 'partial' }] };
  const reportRaw = JSON.stringify(report, null, 2) + '\n';
  const packRaw = JSON.stringify({ version: 1, status: 'authoritative', candidates: [{ candidate: { title: 'Example source' }, sources: [] }] }, null, 2) + '\n';
  fs.writeFileSync(articlePath, finalArticle);
  fs.writeFileSync(path.join(data, 'claim-verification.json'), reportRaw);
  fs.writeFileSync(path.join(data, 'authoritative-evidence-pack.json'), packRaw);
  fs.writeFileSync(path.join(attempt, 'article.md'), originalArticle);
  fs.writeFileSync(path.join(attempt, 'authoritative-evidence-pack.json'), packRaw);
  fs.writeFileSync(path.join(attempt, 'metadata.json'), JSON.stringify({ archivedAt: '2026-10-11T02:00:00Z', status: 'generated-pending-verification', articlePath: 'content/articles/example.md', workflowRun: '12345', workflowSha: 'a'.repeat(40) }, null, 2));
  const result = bindAttemptLineage({ root: tempRoot, runId: '12345', workflowSha: 'a'.repeat(40), boundAt: '2026-10-11T03:00:00.000Z' });
  assert.equal(result.status, 'bound');
  assert.equal(result.bound, 1);
  const finalDir = path.join(data, 'article-attempts', '20261011-example-finalized');
  const meta = JSON.parse(fs.readFileSync(path.join(finalDir, 'metadata.json'), 'utf8'));
  assert.equal(meta.hashesRecordedInWorkflow, true);
  assert.equal(meta.claimVerificationPass, true);
  assert.equal(meta.articleSha256, hash(finalArticle));
  assert.equal(meta.claimReportSha256, hash(reportRaw));
  assert.equal(fs.readFileSync(path.join(finalDir, 'article.md'), 'utf8'), finalArticle);
  assert.equal(fs.readFileSync(path.join(finalDir, 'claim-verification.json'), 'utf8'), reportRaw);
  assert.equal(fs.readFileSync(path.join(attempt, 'article.md'), 'utf8'), originalArticle, 'original attempt must remain immutable');

  const idempotent = bindAttemptLineage({ root: tempRoot, runId: '12345', workflowSha: 'a'.repeat(40), boundAt: '2026-10-11T03:05:00.000Z' });
  assert.equal(idempotent.status, 'bound');
  assert.equal(idempotent.bound, 1);
  assert.equal(idempotent.findings[0].reason.includes('idempotent no-op'), true);

  const conflictDir = path.join(data, 'article-attempts', '20261011-example-finalized-finalized');
  fs.mkdirSync(conflictDir);
  fs.writeFileSync(path.join(conflictDir, 'article.md'), 'different');
  fs.writeFileSync(path.join(conflictDir, 'authoritative-evidence-pack.json'), packRaw);
  fs.writeFileSync(path.join(conflictDir, 'claim-verification.json'), JSON.stringify({ pass: false }));
  fs.writeFileSync(path.join(conflictDir, 'metadata.json'), JSON.stringify({ articlePath: 'content/articles/example.md', workflowRun: '12345', workflowSha: 'a'.repeat(40) }));
  const noMatch = bindAttemptLineage({ root: tempRoot, runId: '99999' });
  assert.equal(noMatch.bound, 0);
  assert.equal(noMatch.status, 'no-run-matched-attempt');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log('BOAT attempt lineage binder: PASS (immutable final bundle; exact hashes; idempotent; mismatches preserved)');

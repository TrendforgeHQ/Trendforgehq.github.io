import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bindAttemptLineage } from './bind-boat-attempt-lineage.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-attempt-lineage-'));
const runId = '123456789';
const workflowSha = 'a'.repeat(40);
const articlePath = 'content/articles/example-story.md';
const articleBytes = Buffer.from('---\ntitle: "Example Story"\n---\nExact article bytes.\n');
const reportBytes = Buffer.from(JSON.stringify({ pass: true, articlePath, articleTitle: 'Example Story', claims: [{ status: 'partial' }] }, null, 2) + '\n');
const packBytes = Buffer.from(JSON.stringify({ version: 1, status: 'authoritative', candidates: [] }, null, 2) + '\n');
const attempt = path.join(root, 'data/article-attempts', 'run-example');
const write = (rel, bytes) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, bytes); };
try {
  write('data/current-run-article.json', JSON.stringify({ generated: true, runId, articlePath }));
  write('data/claim-verification.json', reportBytes);
  write('data/authoritative-evidence-pack.json', packBytes);
  write(articlePath, articleBytes);
  fs.mkdirSync(attempt, { recursive: true });
  write('data/article-attempts/run-example/metadata.json', JSON.stringify({ workflowRun: runId, workflowSha, articlePath, status: 'generated-pending-verification' }));
  write('data/article-attempts/run-example/article.md', articleBytes);
  write('data/article-attempts/run-example/authoritative-evidence-pack.json', packBytes);

  const result = bindAttemptLineage({ root, runId, workflowSha });
  assert.equal(result.status, 'bound');
  assert.equal(result.claimReportPassRecorded, true);
  const metadata = JSON.parse(fs.readFileSync(path.join(attempt, 'metadata.json'), 'utf8'));
  assert.equal(metadata.claimReportSha256.length, 64);
  assert.equal(metadata.articleSha256.length, 64);
  assert.equal(metadata.evidencePackSha256.length, 64);
  assert.equal(metadata.semanticFactualSupport, 'not_assessed');
  assert.equal(metadata.hashesRecordedInWorkflow, true);
  assert.deepEqual(fs.readFileSync(path.join(attempt, 'claim-verification.json')), reportBytes);

  fs.writeFileSync(path.join(root, 'data/authoritative-evidence-pack.json'), Buffer.from('changed pack bytes'));
  assert.throws(() => bindAttemptLineage({ root, runId, workflowSha }), /expected exactly one same-run archive/);

  write('data/current-run-article.json', JSON.stringify({ generated: false, runId, articlePath: null }));
  assert.equal(bindAttemptLineage({ root, runId, workflowSha }).status, 'skipped-no-article');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('BOAT attempt lineage binding tests: PASS (exact article/report/pack hashes, fail-closed mismatch, no-article skip)');

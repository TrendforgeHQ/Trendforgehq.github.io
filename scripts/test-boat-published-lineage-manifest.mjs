import assert from 'node:assert/strict';
import {
  buildPublishedLineageManifest,
  buildPublishedLineageRecord,
} from './boat-published-lineage-manifest.mjs';

const workflowRun = '38126000001';
const workflowSha = 'a'.repeat(40);
const articleBytes = '---\nslug: alpha\ntitle: "Alpha"\n---\n## Evidence\nA supported article body.\n';
const currentRunArticleJson = JSON.stringify({ generated: true, runId: workflowRun, articlePath: 'content/articles/alpha.md' });
const claimReportBytes = JSON.stringify({
  articlePath: 'content/articles/alpha.md',
  generatedAt: '2026-10-11T10:00:00.000Z',
  pass: true,
  claims: [{ index: 1, claim: 'A test claim', status: 'verified' }],
});
const evidencePackBytes = JSON.stringify({
  candidates: [{ candidate: { title: 'Alpha Brief' }, sources: [{ id: 'S1', url: 'https://example.com/source' }] }],
});
const briefBytes = JSON.stringify({ brief: { title: 'Alpha Brief' } });
const base = {
  currentRunArticleJson, articleBytes, claimReportBytes, evidencePackBytes, briefBytes,
  generatedAt: '2026-10-11T10:01:00.000Z',
};

const record = buildPublishedLineageRecord({ ...base, workflowRun, workflowSha });
assert.equal(record.schemaVersion, 1);
assert.equal(record.slug, 'alpha');
assert.equal(record.articlePath, 'content/articles/alpha.md');
assert.equal(record.workflowRun, workflowRun);
assert.equal(record.claimVerification.status, 'pass');
for (const key of ['articleSha256', 'claimReportSha256', 'evidencePackSha256', 'articleBriefSha256', 'currentRunMarkerSha256']) {
  assert.match(record.hashes[key], /^[a-f0-9]{64}$/);
}
assert.equal(record.limits.length, 3);

// Hash exact bytes without normalization.
const changedBytes = buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, articleBytes: articleBytes + '\n' });
assert.notEqual(changedBytes.hashes.articleSha256, record.hashes.articleSha256);

// Fail closed for wrong run, absent generation, wrong article, non-PASS, or invalid pack.
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: true, runId: '1', articlePath: 'content/articles/alpha.md' }) }), /different workflow run/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: false, runId: workflowRun, articlePath: 'content/articles/alpha.md' }) }), /does not confirm generation/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, claimReportBytes: JSON.stringify({ articlePath: 'content/articles/other.md', pass: true, claims: [{}] }) }), /articlePath does not match/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, claimReportBytes: JSON.stringify({ articlePath: 'content/articles/alpha.md', pass: false, claims: [{}] }) }), /not PASS/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, evidencePackBytes: JSON.stringify({ candidates: [] }) }), /exactly one candidate/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, evidencePackBytes: JSON.stringify({ candidates: [{ candidate: { title: 'Alpha Brief' }, sources: [] }] }) }), /has no sources/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: true, runId: workflowRun, articlePath: '../secret.md' }) }), /path is invalid/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, articleBytes: '' }), /missing or empty/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun: 'bad', workflowSha }), /numeric GitHub Actions/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha: 'bad' }), /40-character/);

// Deterministic ordering, duplicate paths blocked, empty manifests rejected.
const beta = {
  ...base,
  currentRunArticleJson: JSON.stringify({ generated: true, runId: workflowRun, articlePath: 'content/articles/beta.md' }),
  claimReportBytes: JSON.stringify({ articlePath: 'content/articles/beta.md', pass: true, claims: [{ claim: 'B' }] }),
};
const manifest = buildPublishedLineageManifest({
  workflowRun, workflowSha, generatedAt: base.generatedAt, records: [beta, base],
});
assert.deepEqual(manifest.records.map(item => item.slug), ['alpha', 'beta']);
assert.throws(() => buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: base.generatedAt, records: [base, base] }), /duplicate articlePath/);
assert.throws(() => buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: base.generatedAt, records: [] }), /at least one/);
assert.throws(() => buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: 'invalid', records: [base] }), /valid timestamp/);

console.log('BOAT published lineage manifest contract tests: PASS');

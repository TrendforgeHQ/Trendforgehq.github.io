import assert from 'node:assert/strict';
import {
  buildPublishedLineageManifest,
  buildPublishedLineageRecord,
} from './boat-published-lineage-manifest.mjs';

const workflowRun = '38126000001';
const workflowSha = 'a'.repeat(40);
const articleBytes = '---\ntitle: "Alpha Story: New Development"\nslug: alpha\n---\n## Evidence\nA supported article body.\n';
const currentRunArticleJson = JSON.stringify({
  version: 1, generated: true, runId: workflowRun,
  articlePath: 'content/articles/alpha.md', briefTitle: 'Alpha Story: New Development',
});
const claimReportBytes = JSON.stringify({
  version: 18, generatedAt: '2026-10-11T10:00:00.000Z',
  articlePath: 'content/articles/alpha.md', articleTitle: 'Alpha Story: New Development',
  claimCount: 1, pass: true, verificationMode: 'test', claims: [{ index: 1, claim: 'A test claim', status: 'verified' }],
});
const candidatePack = {
  version: 1, status: 'authoritative',
  candidate: { title: 'Alpha Story: New Development', link: 'https://example.com/story', category: 'Technology' },
  sources: [{
    id: 'S1', url: 'https://example.com/source', finalUrl: 'https://example.com/source',
    domain: 'example.com', publisherFamily: 'example', title: 'Alpha source',
    verified: true, primary: false, sourceRole: 'DIRECT_REPORTING', credibilityTier: 'high',
    lineage: { id: 'lineage-test', type: 'article', members: 1 },
    passages: ['A concrete supporting passage.'], body: 'A concrete supporting article body.',
  }],
  coverage: {}, blueprint: {}, evidenceBrief: null,
};
const evidencePackBytes = JSON.stringify({ version: 1, status: 'authoritative', candidates: [candidatePack] });
const briefBytes = JSON.stringify({ brief: { title: 'Alpha Story: New Development' } });
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
assert.equal(record.evidencePack.evidencePackVersion, 1);
for (const key of ['articleSha256', 'claimReportSha256', 'evidencePackSha256', 'articleBriefSha256', 'currentRunMarkerSha256']) {
  assert.match(record.hashes[key], /^[a-f0-9]{64}$/);
}
assert.equal(record.limits.length, 3);

// Hash exact bytes without normalization.
const changedBytes = buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, articleBytes: articleBytes + '\n' });
assert.notEqual(changedBytes.hashes.articleSha256, record.hashes.articleSha256);

// Fail closed for wrong run, absent generation, wrong path/title, non-PASS, or malformed evidence.
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: true, runId: '1', articlePath: 'content/articles/alpha.md', briefTitle: 'Alpha Story: New Development' }) }), /different workflow run/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: false, runId: workflowRun, articlePath: 'content/articles/alpha.md', briefTitle: 'Alpha Story: New Development' }) }), /does not confirm generation/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: true, runId: workflowRun, articlePath: 'content/articles/alpha.md', briefTitle: 'Different brief title' }) }), /briefTitle does not match/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, claimReportBytes: JSON.stringify({ articlePath: 'content/articles/other.md', articleTitle: 'Alpha Story: New Development', claimCount: 1, pass: true, claims: [{}] }) }), /articlePath does not match/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, claimReportBytes: JSON.stringify({ articlePath: 'content/articles/alpha.md', articleTitle: 'Alpha Story: New Development', claimCount: 1, pass: false, claims: [{}] }) }), /not PASS/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, claimReportBytes: JSON.stringify({ articlePath: 'content/articles/alpha.md', articleTitle: 'Wrong title', claimCount: 1, pass: true, claims: [{}] }) }), /articleTitle does not match/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, claimReportBytes: JSON.stringify({ articlePath: 'content/articles/alpha.md', articleTitle: 'Alpha Story: New Development', claimCount: 2, pass: true, claims: [{}] }) }), /claimCount does not match/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, evidencePackBytes: JSON.stringify({ version: 1, status: 'authoritative', candidates: [] }) }), /exactly one candidate/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, evidencePackBytes: JSON.stringify({ version: 1, status: 'authoritative', candidates: [candidatePack, candidatePack] }) }), /exactly one candidate/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, evidencePackBytes: JSON.stringify({ candidates: [candidatePack] }) }), /canonical envelope schema/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, evidencePackBytes: JSON.stringify({ version: 1, status: 'authoritative', candidates: [{ ...candidatePack, sources: [] }] }) }), /has no sources/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, currentRunArticleJson: JSON.stringify({ generated: true, runId: workflowRun, articlePath: '../secret.md', briefTitle: 'Alpha Story: New Development' }) }), /path is invalid/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha, articleBytes: '' }), /missing or empty/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun: 'bad', workflowSha }), /numeric GitHub Actions/);
assert.throws(() => buildPublishedLineageRecord({ ...base, workflowRun, workflowSha: 'bad' }), /40-character/);

// Deterministic ordering, duplicate paths blocked, empty manifests rejected.
const betaArticle = articleBytes.replaceAll('Alpha Story: New Development', 'Beta Story: New Development').replaceAll('alpha', 'beta');
const betaBrief = JSON.stringify({ brief: { title: 'Beta Story: New Development' } });
const betaMarker = JSON.stringify({ version: 1, generated: true, runId: workflowRun, articlePath: 'content/articles/beta.md', briefTitle: 'Beta Story: New Development' });
const betaReport = JSON.stringify({ articlePath: 'content/articles/beta.md', articleTitle: 'Beta Story: New Development', claimCount: 1, pass: true, claims: [{ claim: 'B' }] });
const betaPack = JSON.stringify({ version: 1, status: 'authoritative', candidates: [{ ...candidatePack, candidate: { ...candidatePack.candidate, title: 'Beta Story: New Development' } }] });
const beta = { ...base, articleBytes: betaArticle, currentRunArticleJson: betaMarker, claimReportBytes: betaReport, evidencePackBytes: betaPack, briefBytes: betaBrief };
const manifest = buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: base.generatedAt, records: [beta, base] });
assert.deepEqual(manifest.records.map(item => item.slug), ['alpha', 'beta']);
assert.throws(() => buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: base.generatedAt, records: [base, base] }), /duplicate articlePath/);
assert.throws(() => buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: base.generatedAt, records: [] }), /at least one/);
assert.throws(() => buildPublishedLineageManifest({ workflowRun, workflowSha, generatedAt: 'invalid', records: [base] }), /valid timestamp/);

console.log('BOAT published lineage manifest contract tests: PASS');

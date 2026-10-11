import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRecoveredRunArtifacts } from './boat-run-artifact-recovery.mjs';

function fixture() {
  const runId = '123456789';
  const workflowSha = 'a'.repeat(40);
  const articleRaw = [
    '---',
    'title: "Recovered Article"',
    '---',
    '',
    'A verified fixture claim is stated here.',
    'A second claim appears only in the saved report.'
  ].join('\n') + '\n';
  const articleBriefRaw = JSON.stringify({ brief: { title: 'Canonical Source Story - Publisher' } });
  const evidencePack = {
    version: 1,
    status: 'authoritative',
    generatedAt: '2026-10-10T20:00:00.000Z',
    policy: 'canonical',
    candidates: [{
      version: 1,
      status: 'authoritative',
      candidate: { title: 'Canonical Source Story - Publisher', link: 'https://example.com/story', category: 'tech' },
      sources: [
        { id: 'S1', url: 'https://example.com/source-1', title: 'Source One', sourceRole: 'DIRECT_REPORTING', passages: ['The source passage supports the fixture claim.'] },
        { id: 'S2', url: 'https://example.com/source-2', title: 'Source Two', sourceRole: 'CORROBORATION', passages: ['A second source passage.'] }
      ]
    }]
  };
  const evidencePackRaw = JSON.stringify(evidencePack);
  const claimReport = {
    articleTitle: 'Recovered Article',
    articlePath: 'content/articles/recovered-article.md',
    sources: [
      { id: 'S1', url: 'https://example.com/source-1' },
      { id: 'S2', url: 'https://example.com/source-2' }
    ],
    claims: [
      { index: 1, claim: 'A verified fixture claim is stated here.', sourceId: 'S1', bestPassageId: 'S1-FF1' },
      { index: 2, claim: 'A report-only claim not present in the article.', sourceId: 'S2', bestPassageId: 'S2-BODY' }
    ]
  };
  const claimReportRaw = JSON.stringify(claimReport);
  const blockedMetadataRaw = JSON.stringify({ status: 'claim-verification-blocked', workflowRun: runId, workflowSha, reason: 'blocked' });
  const generatedMetadataRaw = JSON.stringify({
    status: 'generated-pending-verification',
    articlePath: 'content/articles/recovered-article.md',
    workflowRun: runId,
    workflowSha,
    evidenceArtifact: 'authoritative-evidence-pack.json'
  });
  return {
    articleRaw, articleBriefRaw, evidencePackRaw, claimReportRaw, blockedMetadataRaw, generatedMetadataRaw,
    artifactRunId: runId, artifactId: '987654321', artifactName: 'fixture-artifact',
    evidencePackEntry: 'attempt/authoritative-evidence-pack.json',
    articleEntry: 'attempt-claim-blocked/article.md',
    claimReportEntry: 'attempt-claim-blocked/claim-verification.json'
  };
}

test('recovers exact brief candidate and validates same-run metadata/source URLs', () => {
  const result = auditRecoveredRunArtifacts(fixture());
  assert.equal(result.packRecoveryStatus, 'recovered');
  assert.equal(result.artifact.runId, '123456789');
  assert.equal(result.candidate.title, 'Canonical Source Story - Publisher');
  assert.deepEqual(result.candidate.sourceIds, ['S1', 'S2']);
  assert.ok(!result.findings.some(item => item.severity === 'high'));
  assert.equal(result.hashes.hashesRecordedAtGeneration, false);
  assert.equal(result.hashes.method, 'computed-from-recovered-bytes');
  assert.equal(result.automaticApplication, false);
});

test('legacy passage IDs are preserved and reported as warnings, never converted', () => {
  const result = auditRecoveredRunArtifacts(fixture());
  assert.equal(result.passageIdAudit.status, 'legacy_or_noncanonical');
  assert.equal(result.passageIdAudit.valuesPreserved, true);
  assert.ok(result.findings.some(item => item.code === 'BR-LEGACY-PASSAGE-IDS'));
  assert.deepEqual(
    result.findings.find(item => item.code === 'BR-LEGACY-PASSAGE-IDS').details.samples.map(item => item.passageId),
    ['S1-FF1', 'S2-BODY']
  );
});

test('article/report partial text coverage is explicit but does not erase pack recovery', () => {
  const result = auditRecoveredRunArtifacts(fixture());
  assert.equal(result.packRecoveryStatus, 'recovered');
  assert.equal(result.report.claimTextCoverage.total, 2);
  assert.equal(result.report.claimTextCoverage.exactTextFoundInArticle, 1);
  assert.deepEqual(result.report.claimTextCoverage.missingClaimIndexes, [2]);
  assert.ok(result.findings.some(item => item.code === 'BR-CLAIMS_NOT_ALL_IN_ARTICLE'));
});

test('wrong artifact run ID blocks recovery', () => {
  const input = fixture();
  input.artifactRunId = '999999999';
  const result = auditRecoveredRunArtifacts(input);
  assert.equal(result.status, 'blocked');
  assert.equal(result.packRecoveryStatus, 'blocked');
  assert.ok(result.findings.some(item => item.code === 'BR-RUN-ID-MISMATCH'));
});

test('source URL mismatch blocks pack/report lineage', () => {
  const input = fixture();
  const report = JSON.parse(input.claimReportRaw);
  report.sources[0].url = 'https://example.com/wrong-source';
  input.claimReportRaw = JSON.stringify(report);
  const result = auditRecoveredRunArtifacts(input);
  assert.equal(result.status, 'blocked');
  assert.equal(result.packRecoveryStatus, 'blocked');
  assert.ok(result.findings.some(item => item.code === 'BR-SOURCE-URL-MISMATCH'));
});

test('brief title mismatch does not select a nearby candidate', () => {
  const input = fixture();
  input.articleBriefRaw = JSON.stringify({ brief: { title: 'Almost the same title' } });
  const result = auditRecoveredRunArtifacts(input);
  assert.equal(result.status, 'blocked');
  assert.equal(result.candidate, null);
  assert.ok(result.findings.some(item => item.code === 'BR-CANDIDATE-NOT-FOUND'));
});

test('missing recovery metadata yields unknown rather than fabricated lineage', () => {
  const input = fixture();
  input.generatedMetadataRaw = null;
  const result = auditRecoveredRunArtifacts(input);
  assert.equal(result.status, 'unknown');
  assert.equal(result.packRecoveryStatus, 'unknown');
  assert.ok(result.findings.some(item => item.code === 'BR-INPUT-MISSING' && item.details.artifact === 'generatedMetadata'));
});

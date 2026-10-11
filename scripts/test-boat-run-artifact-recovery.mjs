import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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


test('all three real archived attempts recover the exact same-run canonical pack from repository siblings', () => {
  const root = process.cwd();
  const fixtures = [
    {
      runId: '38085367295', artifactId: '11682276860', artifactName: 'trendforge-article-attempt-492',
      generatedDir: 'data/article-attempts/20261010-205544-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police',
      blockedDir: 'data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked',
      expectedClaims: 15, expectedPresent: 15, expectedSources: 4
    },
    {
      runId: '37996683799', artifactId: '11647766077', artifactName: 'trendforge-article-attempt-488',
      generatedDir: 'data/article-attempts/20261009-220306-ai-generated-code-blooms-but-software-shipments-stay-flat',
      blockedDir: 'data/article-attempts/20261009-220410-ai-generated-code-blooms-but-software-shipments-stay-flat-claim-blocked',
      expectedClaims: 18, expectedPresent: 18, expectedSources: 4
    },
    {
      runId: '37696062759', artifactId: '11515936671', artifactName: 'trendforge-article-attempt-478',
      generatedDir: 'data/article-attempts/20261007-223019-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal',
      blockedDir: 'data/article-attempts/20261007-223044-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal-claim-blocked',
      expectedClaims: 7, expectedPresent: 4, expectedSources: 2
    }
  ];

  for (const f of fixtures) {
    const file = (dir, name) => path.join(root, dir, name);
    const paths = {
      article: file(f.blockedDir, 'article.md'),
      report: file(f.blockedDir, 'claim-verification.json'),
      brief: file(f.blockedDir, 'article-brief.json'),
      pack: file(f.generatedDir, 'authoritative-evidence-pack.json'),
      blockedMetadata: file(f.blockedDir, 'metadata.json'),
      generatedMetadata: file(f.generatedDir, 'metadata.json')
    };
    for (const [label, filePath] of Object.entries(paths)) {
      assert.equal(fs.existsSync(filePath), true, 'missing real archived fixture ' + label + ': ' + filePath);
    }
    const result = auditRecoveredRunArtifacts({
      articleRaw: fs.readFileSync(paths.article, 'utf8'),
      claimReportRaw: fs.readFileSync(paths.report, 'utf8'),
      articleBriefRaw: fs.readFileSync(paths.brief, 'utf8'),
      evidencePackRaw: fs.readFileSync(paths.pack, 'utf8'),
      blockedMetadataRaw: fs.readFileSync(paths.blockedMetadata, 'utf8'),
      generatedMetadataRaw: fs.readFileSync(paths.generatedMetadata, 'utf8'),
      artifactRunId: f.runId,
      artifactId: f.artifactId,
      artifactName: f.artifactName,
      evidencePackEntry: f.generatedDir + '/authoritative-evidence-pack.json',
      articleEntry: f.blockedDir + '/article.md',
      claimReportEntry: f.blockedDir + '/claim-verification.json'
    });
    assert.equal(result.packRecoveryStatus, 'recovered', f.runId + ': ' + JSON.stringify(result.findings));
    assert.equal(result.artifact.runId, f.runId);
    assert.equal(result.report.claimCount, f.expectedClaims);
    assert.equal(result.report.reportSourceCount, f.expectedSources);
    assert.equal(result.report.claimTextCoverage.total, f.expectedClaims);
    assert.equal(result.report.claimTextCoverage.exactTextFoundInArticle, f.expectedPresent);
    assert.equal(result.hashes.hashesRecordedAtGeneration, false);
    assert.equal(result.semanticSupport, 'not_verified');
    assert.equal(result.automaticApplication, false);
    assert.equal(result.passageIdAudit.valuesPreserved, true);
    assert.ok(result.findings.some(item => item.code === 'BR-LEGACY-PASSAGE-IDS'), f.runId + ': legacy passage warning missing');
    if (f.runId === '37696062759') {
      assert.equal(result.status, 'recovered_with_warnings');
      assert.ok(result.findings.some(item => item.code === 'BR-CLAIMS_NOT_ALL_IN_ARTICLE'));
    }
  }
});

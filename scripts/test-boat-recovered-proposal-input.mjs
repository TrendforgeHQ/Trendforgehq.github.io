import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditRecoveredRunArtifacts } from './boat-run-artifact-recovery.mjs';
import { buildRecoveredProposalInputs } from './boat-recovered-proposal-input.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function syntheticFixture() {
  const articleRaw = '---\ntitle: "Recovered Article"\n---\n\nA verified fixture claim is stated here.\n';
  const articleBriefRaw = JSON.stringify({ brief: { title: 'Canonical Source Story - Publisher' } });
  const evidencePackRaw = JSON.stringify({
    version: 1, status: 'authoritative',
    candidates: [{
      version: 1, status: 'authoritative',
      candidate: { title: 'Canonical Source Story - Publisher', link: 'https://example.com/story' },
      sources: [{ id: 'S1', url: 'https://example.com/source-1', title: 'Source One', passages: ['The source passage supports the fixture claim.'] }]
    }]
  });
  const claimReportRaw = JSON.stringify({
    articleTitle: 'Recovered Article', articlePath: 'content/articles/recovered-article.md',
    sources: [{ id: 'S1', url: 'https://example.com/source-1' }],
    claims: [{ index: 1, claim: 'A verified fixture claim is stated here.', sourceId: 'S1', bestUrl: 'https://example.com/source-1', bestPassageId: 'S1-FF1', bestPassage: 'The source passage supports the fixture claim.' }]
  });
  const blockedMetadataRaw = JSON.stringify({ status: 'claim-verification-blocked', workflowRun: '123456789', workflowSha: 'a'.repeat(40) });
  const generatedMetadataRaw = JSON.stringify({ status: 'generated-pending-verification', articlePath: 'content/articles/recovered-article.md', workflowRun: '123456789', workflowSha: 'a'.repeat(40), evidenceArtifact: 'authoritative-evidence-pack.json' });
  const base = { articleRaw, articleBriefRaw, evidencePackRaw, claimReportRaw, blockedMetadataRaw, generatedMetadataRaw, artifactRunId: '123456789', artifactId: '987654321', artifactName: 'fixture-artifact' };
  const recoveryAudit = auditRecoveredRunArtifacts(base);
  return { ...base, recoveryAudit };
}

function adapt(f) {
  return buildRecoveredProposalInputs({
    recoveryAudit: f.recoveryAudit,
    articleRaw: f.articleRaw,
    claimReportRaw: f.claimReportRaw,
    articleBriefRaw: f.articleBriefRaw,
    evidencePackRaw: f.evidencePackRaw
  });
}

test('synthetic exact-lineage claim becomes an input only, never a generated proposal', () => {
  const result = adapt(syntheticFixture());
  assert.equal(result.status, 'ready_with_restrictions');
  assert.equal(result.counts.eligible, 1);
  assert.equal(result.claims[0].status, 'ready_for_human_proposal');
  assert.equal(result.claims[0].passage.canonicalPassageId, 'S1-P1');
  assert.equal(result.claims[0].passage.mappingIsSuggestionOnly, true);
  assert.equal(result.replacementTextGenerated, false);
  assert.equal(result.approvalRequired, true);
  assert.equal(result.automaticApplication, false);
  assert.equal(result.semanticSupport, 'not_verified');
  assert.equal(result.hashes.recordedAtGeneration, false);
});

test('recovery hash mismatch blocks the bundle', () => {
  const f = syntheticFixture();
  f.articleRaw += 'changed after audit';
  const result = adapt(f);
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some(item => item.code === 'BPI-RECOVERY-HASH-MISMATCH'));
});

test('claim absent from article is blocked even if passage mapping is unique', () => {
  const f = syntheticFixture();
  const report = JSON.parse(f.claimReportRaw);
  report.claims[0].claim = 'A claim that does not exist in the article.';
  f.claimReportRaw = JSON.stringify(report);
  f.recoveryAudit = auditRecoveredRunArtifacts(f);
  const result = adapt(f);
  assert.equal(result.claims[0].status, 'blocked');
  assert.ok(result.claims[0].findings.some(item => item.code === 'BPI-CLAIM-NOT-IN-ARTICLE'));
});

test('unresolved or ambiguous passage never becomes eligible', () => {
  const f = syntheticFixture();
  f.recoveryAudit.passageResolution.claims[0].status = 'ambiguous';
  f.recoveryAudit.passageResolution.claims[0].canonicalPassageId = null;
  const result = adapt(f);
  assert.equal(result.claims[0].status, 'unknown');
  assert.ok(result.claims[0].findings.some(item => item.code === 'BPI-PASSAGE-AMBIGUOUS'));
});

test('report and pack source URL mismatch blocks the bundle', () => {
  const f = syntheticFixture();
  const report = JSON.parse(f.claimReportRaw);
  report.sources[0].url = 'https://example.com/wrong';
  f.claimReportRaw = JSON.stringify(report);
  f.recoveryAudit = auditRecoveredRunArtifacts(f);
  const result = adapt(f);
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some(item => item.code === 'BPI-SOURCE-LINEAGE-MISMATCH'));
});

test('blocked recovery audit cannot authorize proposal inputs', () => {
  const f = syntheticFixture();
  f.recoveryAudit.status = 'blocked';
  f.recoveryAudit.packRecoveryStatus = 'blocked';
  const result = adapt(f);
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some(item => item.code === 'BPI-RECOVERY-NOT-CLEAR'));
});

test('all three recovered archived attempts only expose exact, unique claim inputs', () => {
  const fixtures = [
    {
      runId: '38085367295', artifactId: '11682276860', artifactName: 'trendforge-article-attempt-492',
      generatedDir: 'data/article-attempts/20261010-205544-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police',
      blockedDir: 'data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked',
      expectedClaims: 15, expectedEligible: 12
    },
    {
      runId: '37996683799', artifactId: '11647766077', artifactName: 'trendforge-article-attempt-488',
      generatedDir: 'data/article-attempts/20261009-220306-ai-generated-code-blooms-but-software-shipments-stay-flat',
      blockedDir: 'data/article-attempts/20261009-220410-ai-generated-code-blooms-but-software-shipments-stay-flat-claim-blocked',
      expectedClaims: 18, expectedEligible: 12
    },
    {
      runId: '37696062759', artifactId: '11515936671', artifactName: 'trendforge-article-attempt-478',
      generatedDir: 'data/article-attempts/20261007-223019-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal',
      blockedDir: 'data/article-attempts/20261007-223044-10x-research-bitcoin-bottom-forecast-missed-what-the-numbers-reveal-claim-blocked',
      expectedClaims: 7, expectedEligible: 4
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
    for (const [label, p] of Object.entries(paths)) assert.equal(fs.existsSync(p), true, 'missing archived fixture ' + label + ': ' + p);
    const input = {
      articleRaw: fs.readFileSync(paths.article, 'utf8'),
      claimReportRaw: fs.readFileSync(paths.report, 'utf8'),
      articleBriefRaw: fs.readFileSync(paths.brief, 'utf8'),
      evidencePackRaw: fs.readFileSync(paths.pack, 'utf8'),
      blockedMetadataRaw: fs.readFileSync(paths.blockedMetadata, 'utf8'),
      generatedMetadataRaw: fs.readFileSync(paths.generatedMetadata, 'utf8'),
      artifactRunId: f.runId, artifactId: f.artifactId, artifactName: f.artifactName
    };
    const recoveryAudit = auditRecoveredRunArtifacts(input);
    const result = buildRecoveredProposalInputs({
      recoveryAudit,
      articleRaw: input.articleRaw,
      claimReportRaw: input.claimReportRaw,
      articleBriefRaw: input.articleBriefRaw,
      evidencePackRaw: input.evidencePackRaw
    });
    assert.equal(result.artifact.runId, f.runId);
    assert.equal(result.counts.totalClaims, f.expectedClaims);
    assert.equal(result.counts.eligible, f.expectedEligible, f.runId + ': ' + JSON.stringify(result.claims.map(c => ({ index: c.claimIndex, status: c.status, findings: c.findings }))));
    assert.equal(result.hashes.recordedAtGeneration, false);
    assert.equal(result.approvalRequired, true);
    assert.equal(result.automaticApplication, false);
    assert.equal(result.semanticSupport, 'not_verified');
    for (const claim of result.claims) {
      if (claim.status === 'ready_for_human_proposal') {
        assert.ok(input.articleRaw.includes(claim.originalClaim), f.runId + ': ready claim text must exist in article');
        assert.ok(claim.passage?.canonicalPassageId);
        assert.equal(claim.passage.mappingIsSuggestionOnly, true);
        assert.equal(claim.source.url, recoveryAudit.candidate && result.claims.find(x => x.claimIndex === claim.claimIndex).source.url);
      }
    }
    if (f.runId === '37696062759') {
      assert.equal(result.counts.blocked, 3);
      assert.ok(result.claims.filter(c => c.status === 'blocked').every(c => c.findings.some(x => x.code === 'BPI-CLAIM-NOT-IN-ARTICLE')));
    }
  }
});

import test from 'node:test';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditRecoveredRunArtifacts } from './boat-run-artifact-recovery.mjs';
import { buildRecoveredProposalInputs } from './boat-recovered-proposal-input.mjs';
import { buildReviewReport } from './boat-recovered-proposal-review-report.mjs';

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
  assert.equal(result.proposalEngineHandoff.allowed, false);
  assert.equal(result.proposalEngineHandoff.status, 'blocked');
  assert.match(result.proposalEngineHandoff.reason, /generation-time hashes are absent/);
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
      expectedClaims: 7, expectedEligible: 2
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


test('output schema preserves review-only and recovery-hash constraints', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/recovered-proposal-input.schema.json'), 'utf8'));
  const required = new Set(schema.required);
  for (const key of ['status', 'artifact', 'hashes', 'counts', 'claims', 'approvalRequired', 'automaticApplication', 'semanticSupport', 'replacementTextGenerated']) {
    assert.ok(required.has(key), 'schema must require ' + key);
  }
  assert.deepEqual(schema.properties.status.enum, ['ready_with_restrictions', 'no_eligible_claims', 'blocked', 'unknown']);
  assert.equal(schema.properties.approvalRequired.const, true);
  assert.equal(schema.properties.automaticApplication.const, false);
  assert.equal(schema.properties.semanticSupport.const, 'not_verified');
  assert.equal(schema.properties.replacementTextGenerated.const, false);
  assert.equal(schema.properties.hashes.properties.recordedAtGeneration.const, false);
});

test('CLI writes a separate manifest and refuses to overwrite it', () => {
  const f = syntheticFixture();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-proposal-input-'));
  try {
    const inputs = {
      audit: JSON.stringify(f.recoveryAudit),
      article: f.articleRaw,
      report: f.claimReportRaw,
      brief: f.articleBriefRaw,
      pack: f.evidencePackRaw
    };
    const files = {};
    for (const [key, value] of Object.entries(inputs)) {
      files[key] = path.join(dir, key + (key === 'article' ? '.md' : '.json'));
      fs.writeFileSync(files[key], value, { flag: 'wx' });
    }
    const output = path.join(dir, 'proposal-input.json');
    const cli = path.join(root, 'scripts/boat-recovered-proposal-input.mjs');
    const args = ['--recovery-audit', files.audit, '--article', files.article, '--claim-report', files.report, '--brief', files.brief, '--pack', files.pack, '--output', output];
    const first = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const manifest = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(manifest.status, 'ready_with_restrictions');
    assert.equal(manifest.approvalRequired, true);
    assert.equal(manifest.automaticApplication, false);
    const before = fs.readFileSync(output, 'utf8');
    const second = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(second.status, 2);
    assert.match(second.stderr, /must be a new path/);
    assert.equal(fs.readFileSync(output, 'utf8'), before, 'existing output must remain byte-identical');
    assert.equal(fs.readFileSync(files.article, 'utf8'), f.articleRaw, 'article input must remain unchanged');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI rejects an incomplete argument list without writing output', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/boat-recovered-proposal-input.mjs'), '--article', 'missing.md'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required --recovery-audit/);
});


test('eligibility report schema requires counts and review-only guardrails', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/recovered-proposal-eligibility-report.schema.json'), 'utf8'));
  assert.deepEqual(schema.properties.summary.properties.countsReconciled, { const: true });
  assert.deepEqual(schema.properties.summary.properties.recoveryHashesRecordedAtGeneration, { const: false });
  assert.deepEqual(schema.properties.summary.properties.semanticSupport, { const: 'not_verified' });
  assert.deepEqual(schema.properties.summary.properties.automaticApplication, { const: false });
  assert.deepEqual(schema.properties.summary.properties.proposalEngineHandoffAllowed, { const: false });
  assert.ok(schema.required.includes('runs'));
  assert.ok(schema.properties.runs.items.required.includes('claims'));
  assert.deepEqual(schema.properties.runs.items.properties.countsReconciled, { const: true });
  assert.deepEqual(schema.properties.runs.items.properties.recordedAtGeneration, { const: false });
  assert.deepEqual(schema.properties.runs.items.properties.approvalRequired, { const: true });
  assert.deepEqual(schema.properties.runs.items.properties.automaticApplication, { const: false });
  assert.deepEqual(schema.properties.runs.items.properties.semanticSupport, { const: 'not_verified' });
  assert.deepEqual(schema.properties.runs.items.properties.proposalEngineHandoffAllowed, { const: false });
});

test('read-only eligibility report summarizes per-claim reasons across all archived runs', () => {
  const report = buildReviewReport();
  assert.equal(report.mode, 'offline-read-only');
  assert.equal(report.summary.runs, 3);
  assert.equal(report.summary.claims, 40);
  assert.equal(report.summary.eligible, 26);
  assert.equal(report.summary.blocked, 3);
  assert.equal(report.summary.unknown, 11);
  assert.equal(report.summary.recoveryHashesRecordedAtGeneration, false);
  assert.equal(report.summary.automaticApplication, false);
  assert.equal(report.summary.proposalEngineHandoffAllowed, false);
  assert.equal(report.summary.semanticSupport, 'not_verified');
  assert.equal(report.summary.proposalEngineHandoffAllowed, false);
  assert.equal(report.summary.countsReconciled, true);
  for (const run of report.runs) {
    assert.equal(run.countsReconciled, true);
    assert.equal(run.proposalEngineHandoffAllowed, false);
    assert.equal(run.totalClaims, run.claims.length);
    assert.equal(run.eligible, run.claims.filter(claim => claim.status === 'ready_for_human_proposal').length);
    assert.equal(run.blocked, run.claims.filter(claim => claim.status === 'blocked').length);
    assert.equal(run.unknown, run.claims.filter(claim => claim.status === 'unknown').length);
  }
  assert.deepEqual(report.runs.map(run => run.eligible), [12, 12, 2]);
  const third = report.runs.find(run => run.runId === '37696062759');
  assert.equal(third.totalClaims, 7);
  assert.equal(third.eligible, 2);
  assert.equal(third.blocked, 3);
  assert.equal(third.unknown, 2);
  assert.ok(third.claims.filter(claim => claim.status === 'blocked').every(claim => claim.reasonCodes.includes('BPI-CLAIM-NOT-IN-ARTICLE')));
  assert.ok(report.runs.flatMap(run => run.claims).filter(claim => claim.status === 'ready_for_human_proposal').every(claim => claim.passageId && claim.sourceId));
});


test('eligibility report CLI emits parseable JSON to stdout without writing report files', () => {
  const cli = path.join(root, 'scripts/boat-recovered-proposal-review-report.mjs');
  const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.engine, 'BOAT Recovered Proposal Eligibility Report');
  assert.equal(report.summary.claims, 40);
  assert.equal(report.summary.eligible, 26);
  assert.equal(report.summary.blocked, 3);
  assert.equal(report.summary.unknown, 11);
  assert.equal(report.summary.automaticApplication, false);
  assert.equal(report.summary.semanticSupport, 'not_verified');
  assert.equal(fs.existsSync(path.join(root, 'boat-recovered-proposal-review-report.json')), false);
});

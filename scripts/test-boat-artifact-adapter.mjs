import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { adaptPipelineArtifacts, createProposalFromPipelineArtifacts } from './boat-artifact-adapter.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fixedTime = '2026-10-11T00:00:00.000Z';

function fixture() {
  const articleRaw = 'A verified fixture claim.\n';
  const claimReport = {
    workflowRun: 'run-123',
    claims: [{ index: 1, claim: 'A verified fixture claim.', sourceId: 'S1', sourceRole: 'DIRECT_REPORTING', bestUrl: 'https://example.com/source', matchedPassages: ['S1-P1'], bestPassageId: 'S1-P1', status: 'verified' }]
  };
  const evidencePack = {
    workflowRun: 'run-123',
    sources: [{ id: 'S1', title: 'Fixture source', url: 'https://example.com/source', sourceRole: 'DIRECT_REPORTING', passages: ['Passage text supporting only the fixture setup.'] }]
  };
  const claimReportRaw = JSON.stringify(claimReport, null, 2) + '\n';
  const evidencePackRaw = JSON.stringify(evidencePack, null, 2) + '\n';
  const metadata = {
    workflowRun: 'run-123',
    articleSha256: hash(articleRaw),
    claimReportSha256: hash(claimReportRaw),
    evidencePackSha256: hash(evidencePackRaw)
  };
  const metadataRaw = JSON.stringify(metadata);
  const proposal = { claimIndex: 1, replacementText: 'A cautious proposed replacement.', rationale: 'Illustrative test proposal.', sourceId: 'S1', passageId: 'S1-P1' };
  return { articleRaw, claimReport, evidencePack, claimReportRaw, evidencePackRaw, metadata, metadataRaw, proposal };
}

test('adapter preserves canonical artifact fields and valid hash-bound inputs', () => {
  const f = fixture();
  const adapted = adaptPipelineArtifacts(f);
  assert.equal(adapted.mode, 'read-only');
  assert.deepEqual(adapted.inputs.claimReport.claims[0].matchedPassages, ['S1-P1']);
  assert.equal(adapted.findings.length, 0);
});

test('legacy saved claim-verification shape is preserved, not passage-ID rewritten', () => {
  const f = fixture();
  f.claimReport.claims[0].bestPassageId = 'S1-FF1,S2-FF6';
  f.claimReportRaw = JSON.stringify(f.claimReport, null, 2) + '\n';
  f.metadata.claimReportSha256 = hash(f.claimReportRaw);
  f.metadataRaw = JSON.stringify(f.metadata);
  const adapted = adaptPipelineArtifacts(f);
  assert.equal(adapted.inputs.claimReport.claims[0].bestPassageId, 'S1-FF1,S2-FF6');
});

test('missing evidence pack and recorded hashes stay unknown instead of being synthesized', () => {
  const f = fixture();
  const legacyMetadata = { status: 'claim-verification-blocked', workflowRun: '38085367295', workflowSha: '181d8e5181f2e79da77f496898a33fe27ccef092' };
  const result = createProposalFromPipelineArtifacts({
    articleRaw: f.articleRaw,
    claimReportRaw: f.claimReportRaw,
    evidencePackRaw: null,
    metadataRaw: JSON.stringify(legacyMetadata),
    proposal: f.proposal,
    generatedAt: fixedTime
  });
  assert.equal(result.status, 'unknown');
  assert.equal(result.approvalRequired, true);
  assert.equal(result.automaticApplication, false);
  assert.equal(result.semanticSupport, 'not_verified');
  assert.ok(result.adapter.findings.some(item => item.code === 'BA-EVIDENCE-PACK-MISSING'));
  assert.ok(result.adapter.findings.some(item => item.code === 'BA-RECORDED-HASHES-MISSING'));
});

test('proposal output obeys schema contract for status, review checklist, and safety constants', () => {
  const f = fixture();
  const result = createProposalFromPipelineArtifacts({ ...f, generatedAt: fixedTime });
  assert.ok(['review_required', 'blocked', 'unknown'].includes(result.status));
  assert.equal(result.schemaVersion, '1.0');
  assert.equal(result.engine, 'BOAT Factual Repair Proposal');
  assert.equal(result.mode, 'offline-proposal-only');
  assert.equal(result.approvalRequired, true);
  assert.equal(result.automaticApplication, false);
  assert.equal(result.semanticSupport, 'not_verified');
  assert.equal(result.reviewChecklist.length, 6);
  assert.ok(result.reviewChecklist.every(item => typeof item === 'string' && item.length > 0));
  assert.ok(Array.isArray(result.findings));
  assert.ok(Array.isArray(result.limitations));
});

test('malformed saved JSON is flagged rather than silently normalized', () => {
  const f = fixture();
  const adapted = adaptPipelineArtifacts({ ...f, claimReportRaw: '{not json' });
  assert.ok(adapted.findings.some(item => item.code === 'BA-ARTIFACT-INVALID-JSON' && item.artifact === 'claimReport'));
  assert.equal(adapted.inputs.claimReport, null);
});

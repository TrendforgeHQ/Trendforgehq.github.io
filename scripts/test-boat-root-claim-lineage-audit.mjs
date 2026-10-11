import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { auditRootClaimLineage } from './boat-root-claim-lineage-audit.mjs';

const articleRaw = '---\ntitle: "Example published article"\n---\nBody text.\n';
const report = { articlePath: 'content/articles/example.md', articleTitle: 'Example published article', pass: true, claimCount: 1, claims: [
  { index: 1, claim: 'Example claim', status: 'partial', classification: 'supported_with_context', sourceId: 'S1', bestUrl: 'https://example.com/story', bestPassageId: 'S1-FF1', matchedPassages: ['S1-P1', 'S1-BODY'], coreFactMatch: { factId: 'F1', sourceId: 'S1' }, provenanceFactMatches: [{ factId: 'F1', sourceId: 'S1' }] }
] };
const reportRaw = JSON.stringify(report);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const briefRaw = JSON.stringify({ brief: { title: 'Example source story' } });
const pack = { version: 1, generatedAt: '2026-10-11T00:00:00.000Z', status: 'authoritative', candidates: [{
  candidate: { title: 'Example source story' },
  sources: [{ id: 'S1', url: 'https://example.com/story', body: 'Example full source body.', passages: ['Example passage.'] }],
  evidenceBrief: { relevantPassages: [{ sourceId: 'S1', passageId: 'P1', text: 'Example passage.' }], storyFactMap: { coreFacts: [{ factId: 'F1', sourceId: 'S1', passageId: 'S1-P1' }] } }
}] };
const packRaw = JSON.stringify(pack);
const attemptRecords = [{ metadata: { articlePath: report.articlePath, workflowRun: '12345', workflowSha: 'a'.repeat(40), claimReportSha256: sha256(reportRaw) }, articleRaw, packRaw, reportRaw }];

const resolved = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords });
assert.equal(resolved.status, 'identifiers-resolved-semantic-support-unknown');
assert.equal(resolved.artifacts.packArchiveRunBindingProven, true);
assert.equal(resolved.artifacts.reportRunBindingProven, true);
assert.equal(resolved.artifacts.candidateMatchCount, 1);
assert.equal(resolved.summary.sourceResolved, 1);
assert.equal(resolved.summary.sourceUrlsMatched, 1);
assert.equal(resolved.claims[0].passageResolution.find(p => p.id === 'S1-P1').status, 'passage-id-resolved-fields-only');
assert.equal(resolved.claims[0].passageResolution.find(p => p.id === 'S1-BODY').status, 'source-body-anchor-present-not-a-passage');
assert.equal(resolved.claims[0].passageResolution.find(p => p.id === 'S1-FF1').status, 'fact-anchor-resolved-fields-only');
assert.equal(resolved.claims[0].factualSupport, 'not_assessed');

const hash = value => createHash('sha256').update(value).digest('hex');
const manifest = { workflowRun: '12345', workflowSha: 'a'.repeat(40), records: [{ articlePath: report.articlePath, hashes: { articleSha256: hash(articleRaw), claimReportSha256: hash(reportRaw), evidencePackSha256: hash(packRaw), articleBriefSha256: hash(briefRaw) } }] };
const bound = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords, lineageManifests: [manifest] });
assert.equal(bound.status, 'identifiers-resolved-semantic-support-unknown');
assert.equal(bound.artifacts.reportRunBindingProven, true);
assert.equal(bound.artifacts.matchedLineageManifest, true);
const finalizedAttempt = {
  metadata: { lineageBindingVersion: 1, articlePath: report.articlePath, workflowRun: '12345', workflowSha: 'a'.repeat(40), articleSha256: hash(articleRaw), evidencePackSha256: hash(packRaw), claimReportSha256: hash(reportRaw) },
  articleRaw, packRaw, reportRaw
};
const boundAttempt = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords: [...attemptRecords, finalizedAttempt] });
assert.equal(boundAttempt.status, 'identifiers-resolved-semantic-support-unknown');
assert.equal(boundAttempt.artifacts.reportRunBindingProven, true);
assert.equal(boundAttempt.artifacts.matchedFinalizedAttemptBundle, true);
const badAttempt = { ...finalizedAttempt, metadata: { ...finalizedAttempt.metadata, claimReportSha256: '0'.repeat(64) } };
const unboundAttempt = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords: [...attemptRecords, badAttempt] });
assert.equal(unboundAttempt.artifacts.reportRunBindingProven, false);

const wrongManifest = { ...manifest, records: [{ ...manifest.records[0], hashes: { ...manifest.records[0].hashes, claimReportSha256: '0'.repeat(64) } }] };
const wrongBound = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords, lineageManifests: [wrongManifest] });
assert.equal(wrongBound.artifacts.reportRunBindingProven, false);

const mismatched = auditRootClaimLineage({ reportRaw, packRaw: JSON.stringify({ ...pack, generatedAt: 'different-bytes' }), briefRaw, articleRaw, attemptRecords });
assert.equal(mismatched.status, 'unknown-pack-article-run-binding');
assert.equal(mismatched.artifacts.packArchiveRunBindingProven, false);

const invalid = auditRootClaimLineage({ reportRaw, packRaw: '{not json', briefRaw, articleRaw });
assert.equal(invalid.status, 'unknown-canonical-pack-invalid-or-missing');

const missingCandidate = auditRootClaimLineage({ reportRaw, packRaw, briefRaw: JSON.stringify({ brief: { title: 'Other story' } }), articleRaw, attemptRecords });
assert.equal(missingCandidate.status, 'unknown-canonical-candidate-match');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-lineage-fixture-'));
try {
  fs.mkdirSync(path.join(tempRoot, 'data', 'article-attempts'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'content', 'articles'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'data', 'claim-verification.json'), reportRaw);
  fs.writeFileSync(path.join(tempRoot, 'data', 'authoritative-evidence-pack.json'), packRaw);
  fs.writeFileSync(path.join(tempRoot, 'data', 'article-brief.json'), briefRaw);
  fs.writeFileSync(path.join(tempRoot, 'content', 'articles', 'example.md'), articleRaw);
  const attemptDir = path.join(tempRoot, 'data', 'article-attempts', 'fixture-run');
  fs.mkdirSync(attemptDir);
  fs.writeFileSync(path.join(attemptDir, 'metadata.json'), JSON.stringify({ articlePath: report.articlePath, workflowRun: '12345', workflowSha: 'a'.repeat(40) }));
  fs.writeFileSync(path.join(attemptDir, 'article.md'), articleRaw);
  fs.writeFileSync(path.join(attemptDir, 'authoritative-evidence-pack.json'), packRaw);
  fs.writeFileSync(path.join(attemptDir, 'claim-verification.json'), reportRaw);
  const finalizedDir = path.join(tempRoot, 'data', 'article-attempts', 'fixture-run-finalized');
  fs.mkdirSync(finalizedDir);
  fs.writeFileSync(path.join(finalizedDir, 'article.md'), articleRaw);
  fs.writeFileSync(path.join(finalizedDir, 'authoritative-evidence-pack.json'), packRaw);
  fs.writeFileSync(path.join(finalizedDir, 'claim-verification.json'), reportRaw);
  fs.writeFileSync(path.join(finalizedDir, 'metadata.json'), JSON.stringify({
    articlePath: report.articlePath, workflowRun: '12345', workflowSha: 'a'.repeat(40), lineageBindingVersion: 1,
    articleSha256: hash(articleRaw), evidencePackSha256: hash(packRaw), claimReportSha256: hash(reportRaw)
  }));
  const live = spawnSync(process.execPath, ['scripts/boat-root-claim-lineage-audit.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, BOAT_AUDIT_ROOT: tempRoot }
  });
  assert.equal(live.status, 0, live.stderr);
  const output = JSON.parse(live.stdout);
  assert.equal(output.reportType, 'boat-root-claim-evidence-lineage');
  assert.equal(output.artifacts.evidencePackCandidateCount, 1);
  assert.equal(output.artifacts.candidateMatchCount, 1);
  assert.equal(output.artifacts.packArchiveRunBindingProven, true);
  assert.equal(output.artifacts.reportRunBindingProven, true);
  assert.equal(output.artifacts.matchedFinalizedAttemptBundle, true);
  assert.equal(output.status, 'identifiers-resolved-semantic-support-unknown');
  assert.equal(output.summary.claims, 1);
  assert.equal(output.claims[0].factualSupport, 'not_assessed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log('BOAT root claim/evidence lineage audit: PASS (isolated fixtures; exact report/run hash binding proven; semantic support remains UNKNOWN)');

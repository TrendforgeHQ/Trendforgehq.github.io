import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { auditRootClaimLineage } from './boat-root-claim-lineage-audit.mjs';

const articleRaw = '---\ntitle: "Example published article"\n---\nBody text.\n';
const report = { articlePath: 'content/articles/example.md', articleTitle: 'Example published article', pass: true, claimCount: 1, claims: [
  { index: 1, claim: 'Example claim', status: 'partial', classification: 'supported_with_context', sourceId: 'S1', bestUrl: 'https://example.com/story', bestPassageId: 'S1-FF1', matchedPassages: ['S1-P1', 'S1-BODY'], coreFactMatch: { factId: 'F1', sourceId: 'S1' }, provenanceFactMatches: [{ factId: 'F1', sourceId: 'S1' }] }
] };
const reportRaw = JSON.stringify(report);
const briefRaw = JSON.stringify({ brief: { title: 'Example source story' } });
const pack = { version: 1, status: 'authoritative', candidates: [{
  candidate: { title: 'Example source story' },
  sources: [{ id: 'S1', url: 'https://example.com/story', body: 'Example full source body.', passages: ['Example passage.'] }],
  evidenceBrief: { relevantPassages: [{ sourceId: 'S1', passageId: 'P1', text: 'Example passage.' }], storyFactMap: { facts: [{ factId: 'F1', sourceId: 'S1', passageId: 'S1-P1' }] } }
}] };
const packRaw = JSON.stringify(pack);
const attemptRecords = [{ metadata: { articlePath: report.articlePath, workflowRun: '12345', workflowSha: 'a'.repeat(40) }, articleRaw, packRaw }];

const resolved = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords });
assert.equal(resolved.status, 'unknown-report-run-binding');
assert.equal(resolved.artifacts.packArticleRunBindingProven, true);
assert.equal(resolved.artifacts.archivedArticleBytesMatchCurrent, true);
assert.equal(resolved.artifacts.reportRunBindingProven, false);
assert.equal(resolved.artifacts.candidateMatchCount, 1);
assert.equal(resolved.summary.sourceResolved, 1);
assert.equal(resolved.summary.sourceUrlsMatched, 1);
assert.equal(resolved.claims[0].passageResolution.find(p => p.id === 'S1-P1').status, 'passage-id-resolved-fields-only');
assert.equal(resolved.claims[0].passageResolution.find(p => p.id === 'S1-BODY').status, 'source-body-anchor-present-not-a-passage');
assert.equal(resolved.claims[0].passageResolution.find(p => p.id === 'S1-FF1').status, 'fact-anchor-resolved-fields-only');
assert.equal(resolved.claims[0].factualSupport, 'not_assessed');

const repairedArticleAttempt = auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw: articleRaw + 'post-repair change', attemptRecords: [{ metadata: attemptRecords[0].metadata, articleRaw: articleRaw, packRaw }] });
assert.equal(repairedArticleAttempt.artifacts.packArticleRunBindingProven, true);
assert.equal(repairedArticleAttempt.artifacts.archivedArticleBytesMatchCurrent, false);
assert.equal(repairedArticleAttempt.status, 'unknown-report-run-binding');

const mismatched = auditRootClaimLineage({ reportRaw, packRaw: JSON.stringify({ ...pack, generatedAt: 'different-bytes' }), briefRaw, articleRaw, attemptRecords });
assert.equal(mismatched.status, 'unknown-pack-article-run-binding');
assert.equal(mismatched.artifacts.packArticleRunBindingProven, false);

const invalid = auditRootClaimLineage({ reportRaw, packRaw: '{not json', briefRaw, articleRaw });
assert.equal(invalid.status, 'unknown-canonical-pack-invalid-or-missing');

const missingCandidate = auditRootClaimLineage({ reportRaw, packRaw, briefRaw: JSON.stringify({ brief: { title: 'Other story' } }), articleRaw, attemptRecords });
assert.equal(missingCandidate.status, 'unknown-canonical-candidate-match');

const live = spawnSync(process.execPath, ['scripts/boat-root-claim-lineage-audit.mjs'], { encoding: 'utf8' });
assert.equal(live.status, 0, live.stderr);
const output = JSON.parse(live.stdout);
assert.equal(output.reportType, 'boat-root-claim-evidence-lineage');
assert.equal(output.artifacts.reportPresent, true);
assert.equal(output.artifacts.evidencePackValidJson, true);
assert.equal(output.artifacts.evidencePackCandidateCount, 24);
assert.equal(output.artifacts.candidateMatchCount, 1);
assert.equal(output.summary.claims, 10);
assert.equal(output.artifacts.reportRunBindingProven, false);
assert.equal(output.claims.every(c => c.factualSupport === 'not_assessed'), true);
console.log('BOAT root claim/evidence lineage audit: PASS (canonical candidate and claim IDs traced; report/run binding remains UNKNOWN)');
console.log('BOAT root claim/evidence lineage live summary:', JSON.stringify({ status: output.status, artifacts: { evidencePackCandidateCount: output.artifacts.evidencePackCandidateCount, candidateMatchCount: output.artifacts.candidateMatchCount, packArticleRunBindingProven: output.artifacts.packArticleRunBindingProven, matchedWorkflowRun: output.artifacts.matchedWorkflowRun, archivedArticleBytesMatchCurrent: output.artifacts.archivedArticleBytesMatchCurrent, reportRunBindingProven: output.artifacts.reportRunBindingProven }, summary: output.summary, claimResolutions: output.claims.map(c => ({ index: c.claimIndex, sourceResolution: c.sourceResolution, sourceUrlMatchesCandidate: c.sourceUrlMatchesCandidate, passages: c.passageResolution.map(p => ({ id: p.id, status: p.status })) })) }));

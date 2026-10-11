import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditReviewSet } from './boat-semantic-support-review-set.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts/boat-semantic-support-review-set.mjs');

function review({ id = 'SSR-TEST-001', reviewer = 'reviewer-a', verdict = 'supported', replacement = 'The company announced the product on Monday.', run = '12345' } = {}) {
  return {
    schemaVersion: '1.0', reviewId: id, reviewStatus: 'completed',
    reviewer: { reviewerId: reviewer, role: 'fact_checker', independenceDisclosure: 'No known conflict declared for this fixture.', reviewedAt: '2026-10-11T00:00:00.000Z' },
    subject: { workflowRun: run, workflowSha: 'abcdef1234567', articleSha256: 'a'.repeat(64), claimReportSha256: 'b'.repeat(64), evidencePackSha256: 'c'.repeat(64), proposalId: 'proposal-test-1' },
    claim: { claimIndex: 1, exactClaimText: 'The company announced the product on Monday.', proposedReplacement: replacement, sourceId: 'S1', passageId: 'S1-P1', sourceUrl: 'https://example.com/source', passageText: 'The company announced the product on Monday.' },
    assessment: { verdict, factualComponents: [{ component: 'Announcement occurred Monday', support: 'direct', passageQuote: 'announced the product on Monday', explanation: 'The quoted wording directly states the event and date.' }], scopeAlignment: 'exact', temporalAlignment: 'aligned', attributionAlignment: 'aligned', uncertaintyPreserved: true, rationale: 'The cited passage directly supports the event and date; no additional factual detail is introduced.' },
    decision: { recommendation: 'accept_for_existing_gates', riskFlags: [], requiredFollowUp: 'Run existing gates; this record does not approve publication.' },
    safety: { semanticSupport: 'not_verified', approvalRequired: true, automaticApplication: false, existingGatesStillRequired: true }
  };
}
function runCli(dir, input, filename='reviews.json') {
  const file = path.join(dir, filename); fs.writeFileSync(file, typeof input === 'string' ? input : JSON.stringify(input, null, 2));
  return { ...spawnSync(process.execPath, [cli, file], { encoding: 'utf8' }), file };
}

test('non-array input is rejected', () => {
  const report = auditReviewSet({});
  assert.equal(report.valid, false); assert.equal(report.reviewSetStatus, 'invalid_input');
});
test('same review ID is a blocking issue even for exact duplicate records', () => {
  const a = review(); const report = auditReviewSet([a, structuredClone(a)]);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some(f => f.type === 'duplicate_review_id_exact_copy' && f.severity === 'blocking'));
  assert.equal(report.subjectGroups.length, 0);
});
test('same review ID with different contents never selects a canonical record', () => {
  const report = auditReviewSet([review(), review({ id: 'SSR-TEST-001', verdict: 'unsupported', reviewer: 'reviewer-b' })]);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some(f => f.type === 'duplicate_review_id_conflict'));
  assert.equal(report.subjectGroups.length, 0);
});
test('different reviewers with conflicting verdicts preserve dissent and never aggregate a winner', () => {
  const report = auditReviewSet([review({ id: 'SSR-AAA-001', reviewer: 'reviewer-a', verdict: 'supported' }), review({ id: 'SSR-BBB-002', reviewer: 'reviewer-b', verdict: 'unsupported' })]);
  const group = report.subjectGroups[0];
  assert.equal(group.status, 'conflicting_independent_reviews');
  assert.equal(group.aggregateVerdict, null); assert.equal(group.automaticAdjudication, false);
  assert.ok(report.findings.some(f => f.type === 'conflicting_independent_reviews' && f.recordIndices.length === 2));
});
test('same verdict from independent reviewers is descriptive agreement only', () => {
  const report = auditReviewSet([review({ id: 'SSR-AAA-001', reviewer: 'reviewer-a' }), review({ id: 'SSR-BBB-002', reviewer: 'reviewer-b' })]);
  assert.equal(report.subjectGroups[0].status, 'independent_agreement');
  assert.equal(report.subjectGroups[0].aggregateVerdict, null);
  assert.ok(report.findings.some(f => f.type === 'independent_agreement'));
});
test('multiple records from one reviewer do not count as independent reviewers', () => {
  const report = auditReviewSet([review({ id: 'SSR-AAA-001', reviewer: 'reviewer-a', verdict: 'supported' }), review({ id: 'SSR-BBB-002', reviewer: 'reviewer-a', verdict: 'unsupported' })]);
  assert.equal(report.subjectGroups[0].independentReviewCount, 0);
  assert.equal(report.subjectGroups[0].status, 'single_or_non_independent_review');
  assert.ok(report.findings.some(f => f.type === 'same_reviewer_disagreement'));
  assert.ok(!report.findings.some(f => f.type === 'conflicting_independent_reviews'));
});
test('different exact bundles or replacements are not compared as one subject', () => {
  const report = auditReviewSet([review({ id: 'SSR-AAA-001', reviewer: 'reviewer-a', verdict: 'supported' }), review({ id: 'SSR-BBB-002', reviewer: 'reviewer-b', verdict: 'unsupported', run: '67890' })]);
  assert.equal(report.subjectGroups.length, 2);
  assert.ok(!report.findings.some(f => f.type === 'conflicting_independent_reviews'));
});
test('invalid records are reported and excluded from review comparison', () => {
  const bad = review({ id: 'SSR-BAD-001', reviewer: 'reviewer-a' }); bad.safety.automaticApplication = true;
  const good = review({ id: 'SSR-GOOD-002', reviewer: 'reviewer-b', verdict: 'unsupported' });
  const report = auditReviewSet([bad, good]);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some(f => f.type === 'invalid_review_record'));
  assert.equal(report.subjectGroups.length, 0);
});
test('CLI emits JSON, exits non-zero for duplicate IDs, and leaves input file unchanged', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-set-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const data = [review(), structuredClone(review())]; const result = runCli(dir, data);
  assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).valid, false);
  assert.equal(fs.readFileSync(result.file, 'utf8'), JSON.stringify(data, null, 2));
});
test('CLI reports conflict without claiming a valid aggregate verdict', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-set-conflict-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const data = [review({ id: 'SSR-AAA-001', reviewer: 'reviewer-a' }), review({ id: 'SSR-BBB-002', reviewer: 'reviewer-b', verdict: 'unsupported' })];
  const result = runCli(dir, data);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.reviewSetStatus, 'conflicting_reviews_require_human_resolution');
  assert.equal(report.subjectGroups[0].aggregateVerdict, null);
});

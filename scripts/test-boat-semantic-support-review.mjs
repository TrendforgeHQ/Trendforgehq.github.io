import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/semantic-support-review.schema.json'), 'utf8'));
const rubric = fs.readFileSync(path.join(root, 'BOAT/SEMANTIC_SUPPORT_REVIEW.md'), 'utf8');

function validReview(overrides = {}) {
  return {
    schemaVersion: '1.0',
    reviewId: 'SSR-TEST-001',
    reviewStatus: 'completed',
    reviewer: { reviewerId: 'reviewer-test', role: 'fact_checker', independenceDisclosure: 'No known conflict declared for this fixture.', reviewedAt: '2026-10-11T00:00:00.000Z' },
    subject: { workflowRun: '12345', workflowSha: 'abcdef1234567', articleSha256: 'a'.repeat(64), claimReportSha256: 'b'.repeat(64), evidencePackSha256: 'c'.repeat(64), proposalId: 'proposal-test-1' },
    claim: { claimIndex: 1, exactClaimText: 'The company announced the product on Monday.', proposedReplacement: 'The company announced the product on Monday.', sourceId: 'S1', passageId: 'S1-P1', sourceUrl: 'https://example.com/source', passageText: 'The company announced the product on Monday.' },
    assessment: {
      verdict: 'supported',
      factualComponents: [{ component: 'Announcement occurred Monday', support: 'direct', passageQuote: 'announced the product on Monday', explanation: 'The quoted wording directly states the event and date.' }],
      scopeAlignment: 'exact', temporalAlignment: 'aligned', attributionAlignment: 'aligned', uncertaintyPreserved: true,
      rationale: 'The cited passage directly supports the event and date; no additional factual detail is introduced.'
    },
    decision: { recommendation: 'accept_for_existing_gates', riskFlags: [], requiredFollowUp: 'Run the existing claim and editorial gates; this record does not approve publication.' },
    safety: { semanticSupport: 'not_verified', approvalRequired: true, automaticApplication: false, existingGatesStillRequired: true },
    ...overrides
  };
}

test('schema requires frozen bundle identity and reviewer identity', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.ok(schema.required.includes('reviewer'));
  assert.ok(schema.required.includes('subject'));
  for (const key of ['workflowRun', 'workflowSha', 'articleSha256', 'claimReportSha256', 'evidencePackSha256', 'proposalId']) {
    assert.ok(schema.properties.subject.required.includes(key), 'missing subject requirement: ' + key);
  }
  assert.match(schema.properties.subject.properties.articleSha256.pattern, /64/);
  assert.match(schema.properties.subject.properties.claimReportSha256.pattern, /64/);
  assert.match(schema.properties.subject.properties.evidencePackSha256.pattern, /64/);
});

test('schema requires component-level support plus scope, time, attribution, and uncertainty checks', () => {
  const assessment = schema.properties.assessment;
  for (const key of ['verdict', 'factualComponents', 'scopeAlignment', 'temporalAlignment', 'attributionAlignment', 'uncertaintyPreserved', 'rationale']) {
    assert.ok(assessment.required.includes(key), 'missing assessment requirement: ' + key);
  }
  assert.deepEqual(assessment.properties.verdict.enum, ['supported', 'partially_supported', 'unsupported', 'unclear']);
  assert.deepEqual(assessment.properties.factualComponents.items.properties.support.enum, ['direct', 'partial', 'contradicted', 'absent', 'ambiguous']);
});

test('valid fixture carries immutable safety boundary and exact bundle hashes', () => {
  const review = validReview();
  assert.match(review.subject.articleSha256, /^[a-f0-9]{64}$/);
  assert.match(review.subject.claimReportSha256, /^[a-f0-9]{64}$/);
  assert.match(review.subject.evidencePackSha256, /^[a-f0-9]{64}$/);
  assert.equal(review.safety.semanticSupport, 'not_verified');
  assert.equal(review.safety.approvalRequired, true);
  assert.equal(review.safety.automaticApplication, false);
  assert.equal(review.safety.existingGatesStillRequired, true);
});

test('partial, unsupported and unclear outcomes remain distinct', () => {
  const allowed = schema.properties.assessment.properties.verdict.enum;
  assert.ok(allowed.includes('partially_supported'));
  assert.ok(allowed.includes('unsupported'));
  assert.ok(allowed.includes('unclear'));
  assert.notEqual('partially_supported', 'supported');
});

test('recommendations are advisory and never encode automatic publication', () => {
  const allowed = schema.properties.decision.properties.recommendation.enum;
  assert.deepEqual(allowed, ['accept_for_existing_gates', 'revise_proposal', 'reject_proposal', 'needs_second_review']);
  assert.equal(schema.properties.safety.properties.automaticApplication.const, false);
  assert.equal(schema.properties.safety.properties.approvalRequired.const, true);
});

test('rubric defines conservative verdict rules, disagreement handling, and explicit limitations', () => {
  for (const phrase of ['supported', 'partially_supported', 'unsupported', 'unclear', 'second reviewer', 'does not semantically validate', 'Existing claim-verification']) {
    assert.ok(rubric.toLowerCase().includes(phrase.toLowerCase()), 'rubric missing: ' + phrase);
  }
});

test('schema rejects unreviewed extras by contract and fixes safety properties', () => {
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.safety.additionalProperties, false);
  assert.equal(schema.properties.safety.properties.semanticSupport.const, 'not_verified');
  assert.equal(schema.properties.safety.properties.approvalRequired.const, true);
  assert.equal(schema.properties.safety.properties.automaticApplication.const, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { auditReviewSet } from './boat-semantic-support-review-set.mjs';
import { reviewSetFixtures } from './fixtures/boat-semantic-support-review-set-fixtures.mjs';

function canonicalReport(report) {
  return {
    valid: report.valid,
    reviewSetStatus: report.reviewSetStatus,
    recordCount: report.recordCount,
    validRecordCount: report.validRecordCount,
    records: report.records.map(record => ({
      reviewId: record.reviewId,
      reviewerId: record.reviewerId,
      verdict: record.verdict,
      eligible: record.eligible,
      errorCount: record.errors.length
    })),
    findings: report.findings.map(finding => ({
      type: finding.type,
      severity: finding.severity,
      reviewId: finding.reviewId ?? null,
      reviewerId: finding.reviewerId ?? null,
      reviewerIds: finding.reviewerIds ? [...finding.reviewerIds].sort() : null,
      verdicts: finding.verdicts ? [...finding.verdicts].sort() : null
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    subjectGroups: report.subjectGroups.map(group => ({
      independentReviewCount: group.independentReviewCount,
      verdicts: [...group.verdicts].sort(),
      allVerdicts: [...group.allVerdicts].sort(),
      status: group.status,
      aggregateVerdict: group.aggregateVerdict,
      automaticAdjudication: group.automaticAdjudication
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  };
}

const golden = {
  duplicateIds: {
    valid: false,
    reviewSetStatus: 'identity_or_record_errors',
    recordCount: 2,
    validRecordCount: 2,
    records: [
      { reviewId: 'SSR-GOLD-001', reviewerId: 'reviewer-a', verdict: 'supported', eligible: true, errorCount: 0 },
      { reviewId: 'SSR-GOLD-001', reviewerId: 'reviewer-a', verdict: 'supported', eligible: true, errorCount: 0 }
    ],
    findings: [{ type: 'duplicate_review_id_exact_copy', severity: 'blocking', reviewId: 'SSR-GOLD-001', reviewerId: null, reviewerIds: null, verdicts: null }],
    subjectGroups: []
  },
  independentDisagreement: {
    valid: true,
    reviewSetStatus: 'conflicting_reviews_require_human_resolution',
    recordCount: 2,
    validRecordCount: 2,
    records: [
      { reviewId: 'SSR-GOLD-101', reviewerId: 'reviewer-a', verdict: 'supported', eligible: true, errorCount: 0 },
      { reviewId: 'SSR-GOLD-102', reviewerId: 'reviewer-b', verdict: 'unsupported', eligible: true, errorCount: 0 }
    ],
    findings: [{ type: 'conflicting_independent_reviews', severity: 'human_resolution_required', reviewId: null, reviewerId: null, reviewerIds: ['reviewer-a', 'reviewer-b'], verdicts: ['supported', 'unsupported'] }],
    subjectGroups: [{ independentReviewCount: 2, verdicts: ['supported', 'unsupported'], allVerdicts: ['supported', 'unsupported'], status: 'conflicting_independent_reviews', aggregateVerdict: null, automaticAdjudication: false }]
  },
  sameReviewerRepeat: {
    valid: true,
    reviewSetStatus: 'conflicting_reviews_require_human_resolution',
    recordCount: 2,
    validRecordCount: 2,
    records: [
      { reviewId: 'SSR-GOLD-201', reviewerId: 'reviewer-a', verdict: 'supported', eligible: true, errorCount: 0 },
      { reviewId: 'SSR-GOLD-202', reviewerId: 'reviewer-a', verdict: 'unsupported', eligible: true, errorCount: 0 }
    ],
    findings: [{ type: 'same_reviewer_disagreement', severity: 'review_required', reviewId: null, reviewerId: 'reviewer-a', reviewerIds: null, verdicts: ['supported', 'unsupported'] }],
    subjectGroups: [{ independentReviewCount: 0, verdicts: [], allVerdicts: ['supported', 'unsupported'], status: 'single_or_non_independent_review', aggregateVerdict: null, automaticAdjudication: false }]
  },
  invalidRecord: {
    valid: false,
    reviewSetStatus: 'identity_or_record_errors',
    recordCount: 2,
    validRecordCount: 1,
    records: [
      { reviewId: 'SSR-GOLD-301', reviewerId: 'reviewer-a', verdict: 'supported', eligible: false, errorCount: 1 },
      { reviewId: 'SSR-GOLD-302', reviewerId: 'reviewer-b', verdict: 'unsupported', eligible: true, errorCount: 0 }
    ],
    findings: [{ type: 'invalid_review_record', severity: 'blocking', reviewId: 'SSR-GOLD-301', reviewerId: null, reviewerIds: null, verdicts: null }],
    subjectGroups: [{ independentReviewCount: 1, verdicts: ['unsupported'], allVerdicts: ['unsupported'], status: 'single_or_non_independent_review', aggregateVerdict: null, automaticAdjudication: false }]
  }
};

for (const [name, fixture] of Object.entries(reviewSetFixtures)) {
  test(`golden report: ${name}`, () => {
    assert.deepEqual(canonicalReport(auditReviewSet(fixture)), golden[name]);
  });
}

test('permuting input preserves canonical audit findings and every dissenting verdict', () => {
  for (const [name, fixture] of Object.entries(reviewSetFixtures)) {
    const original = auditReviewSet(fixture);
    const reversed = auditReviewSet([...fixture].reverse());
    assert.deepEqual(canonicalReport(reversed), canonicalReport(original), name);
    // The report deliberately preserves caller/source order in its records array.
    assert.deepEqual(reversed.records.map(record => record.reviewId), [...fixture].reverse().map(record => record.reviewId), name);
    assert.deepEqual(original.records.map(record => record.reviewId), fixture.map(record => record.reviewId), name);
    const originalDissent = original.subjectGroups.flatMap(group => group.allVerdicts).sort();
    const reversedDissent = reversed.subjectGroups.flatMap(group => group.allVerdicts).sort();
    assert.deepEqual(reversedDissent, originalDissent, name);
    assert.ok(original.subjectGroups.every(group => group.aggregateVerdict === null && group.automaticAdjudication === false), name);
  }
});

test('independent disagreement retains both verdicts and never creates a winner', () => {
  const report = auditReviewSet(reviewSetFixtures.independentDisagreement);
  const group = report.subjectGroups[0];
  assert.deepEqual([...group.allVerdicts].sort(), ['supported', 'unsupported']);
  assert.equal(group.aggregateVerdict, null);
  assert.equal(group.automaticAdjudication, false);
  assert.equal(report.findings.filter(item => item.type === 'conflicting_independent_reviews').length, 1);
});

test('invalid and duplicate-ID records remain in source records, not silently dropped', () => {
  for (const name of ['duplicateIds', 'invalidRecord']) {
    const fixture = reviewSetFixtures[name];
    const report = auditReviewSet(fixture);
    assert.equal(report.records.length, fixture.length);
    assert.deepEqual(report.records.map(record => record.reviewId), fixture.map(record => record.reviewId));
  }
});

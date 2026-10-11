import { createHash } from 'node:crypto';
import { validateSemanticSupportReview } from './boat-semantic-support-review-validator.mjs';

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function subjectKey(review) {
  const { subject, claim } = review;
  const identity = stableJson({
    workflowRun: subject.workflowRun,
    workflowSha: subject.workflowSha,
    articleSha256: subject.articleSha256,
    claimReportSha256: subject.claimReportSha256,
    evidencePackSha256: subject.evidencePackSha256,
    proposalId: subject.proposalId,
    claimIndex: claim.claimIndex,
    exactClaimText: claim.exactClaimText,
    proposedReplacement: claim.proposedReplacement,
    sourceId: claim.sourceId,
    passageId: claim.passageId,
    sourceUrl: claim.sourceUrl,
    passageText: claim.passageText
  });
  return createHash('sha256').update(identity).digest('hex');
}

export function auditReviewSet(input) {
  if (!Array.isArray(input)) {
    return { valid: false, reviewSetStatus: 'invalid_input', recordCount: 0, records: [], findings: [{ type: 'invalid_input', message: 'Input must be a JSON array of review records.' }], subjectGroups: [] };
  }

  const records = input.map((review, index) => {
    const errors = validateSemanticSupportReview(review);
    return {
      index,
      reviewId: review && typeof review === 'object' && !Array.isArray(review) && (typeof review.reviewId === 'string' || review.reviewId === null || review.reviewId === undefined) ? (review.reviewId ?? null) : null,
      reviewerId: typeof review?.reviewer?.reviewerId === 'string' ? review.reviewer.reviewerId : null,
      verdict: ['supported', 'partially_supported', 'unsupported', 'unclear'].includes(review?.assessment?.verdict) ? review.assessment.verdict : null,
      errors,
      eligible: errors.length === 0,
      signature: stableJson(review)
    };
  });

  const findings = [];
  const ids = new Map();
  for (const record of records) {
    if (typeof record.reviewId !== 'string' || record.reviewId.length === 0) continue;
    if (!ids.has(record.reviewId)) ids.set(record.reviewId, []);
    ids.get(record.reviewId).push(record.index);
  }

  const collidedIndices = new Set();
  for (const [reviewId, indices] of ids) {
    if (indices.length < 2) continue;
    indices.forEach(index => collidedIndices.add(index));
    const exactDuplicate = new Set(indices.map(index => records[index].signature)).size === 1;
    findings.push({
      type: exactDuplicate ? 'duplicate_review_id_exact_copy' : 'duplicate_review_id_conflict',
      severity: 'blocking',
      reviewId,
      recordIndices: indices,
      message: exactDuplicate
        ? 'Repeated reviewId found for identical records; preserve inputs and resolve the duplicate import explicitly.'
        : 'Repeated reviewId refers to different record contents; do not choose a canonical version automatically.'
    });
  }

  const groups = new Map();
  input.forEach((review, index) => {
    if (!records[index].eligible || collidedIndices.has(index)) return;
    const key = subjectKey(review);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ index, reviewerId: review.reviewer.reviewerId, verdict: review.assessment.verdict });
  });

  const subjectGroups = [];
  for (const [key, entries] of groups) {
    const byReviewer = new Map();
    for (const entry of entries) {
      if (!byReviewer.has(entry.reviewerId)) byReviewer.set(entry.reviewerId, []);
      byReviewer.get(entry.reviewerId).push(entry);
    }
    const reviewerRepeatIndices = [];
    const independent = [];
    for (const [reviewerId, reviewerEntries] of [...byReviewer.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (reviewerEntries.length > 1) {
        reviewerRepeatIndices.push(...reviewerEntries.map(entry => entry.index));
        const verdicts = [...new Set(reviewerEntries.map(entry => entry.verdict))];
        findings.push({
          type: verdicts.length > 1 ? 'same_reviewer_disagreement' : 'same_reviewer_repeat',
          severity: 'review_required',
          reviewerId,
          recordIndices: reviewerEntries.map(entry => entry.index),
          verdicts: [...verdicts].sort(),
          subjectFingerprint: key,
          message: verdicts.length > 1
            ? 'One reviewer supplied different verdicts for the same exact subject; this is not independent disagreement.'
            : 'One reviewer has multiple records for the same exact subject; they do not count as independent reviews.'
        });
      } else independent.push(reviewerEntries[0]);
    }
    const verdicts = [...new Set(independent.map(entry => entry.verdict))].sort();
    const allVerdicts = [...new Set(entries.map(entry => entry.verdict))].sort();
    let status = 'single_or_non_independent_review';
    if (independent.length >= 2 && verdicts.length > 1) status = 'conflicting_independent_reviews';
    else if (independent.length >= 2 && verdicts.length === 1) status = 'independent_agreement';
    if (status === 'conflicting_independent_reviews') {
      findings.push({
        type: status,
        severity: 'human_resolution_required',
        recordIndices: independent.map(entry => entry.index),
        reviewerIds: independent.map(entry => entry.reviewerId).sort(),
        verdicts: [...verdicts].sort(),
        subjectFingerprint: key,
        message: 'Independent reviewers disagree. Preserve every review; no winner or aggregate verdict is selected.'
      });
    } else if (status === 'independent_agreement') {
      findings.push({
        type: status,
        severity: 'informational',
        recordIndices: independent.map(entry => entry.index),
        reviewerIds: independent.map(entry => entry.reviewerId).sort(),
        verdicts: [...verdicts].sort(),
        subjectFingerprint: key,
        message: 'Independent reviewers recorded the same verdict. This is descriptive agreement, not proof of truth or publication approval.'
      });
    }
    subjectGroups.push({
      subjectFingerprint: key,
      recordIndices: entries.map(entry => entry.index),
      independentReviewCount: independent.length,
      verdicts,
      allVerdicts,
      status,
      aggregateVerdict: null,
      automaticAdjudication: false
    });
  }

  for (const record of records) {
    if (!record.eligible) findings.push({
      type: 'invalid_review_record',
      severity: 'blocking',
      recordIndices: [record.index],
      reviewId: record.reviewId,
      errors: record.errors,
      message: 'Invalid records are excluded from agreement/conflict analysis.'
    });
  }

  // Keep source records and all input-relative indices untouched, but make report collection order stable.
  // Findings tied to a subject carry its opaque fingerprint so same-type findings across subjects sort consistently.
  findings.sort((a, b) => {
    const { recordIndices: _aIndices, ...aStable } = a;
    const { recordIndices: _bIndices, ...bStable } = b;
    return stableJson(aStable).localeCompare(stableJson(bStable));
  });
  subjectGroups.sort((a, b) => a.subjectFingerprint.localeCompare(b.subjectFingerprint));

  const blocking = findings.some(finding => finding.severity === 'blocking');
  const conflicts = findings.some(finding => finding.type === 'conflicting_independent_reviews' || finding.type === 'same_reviewer_disagreement');
  return {
    valid: !blocking,
    reviewSetStatus: blocking ? 'identity_or_record_errors' : conflicts ? 'conflicting_reviews_require_human_resolution' : 'audited_no_conflict_detected',
    recordCount: input.length,
    validRecordCount: records.filter(record => record.eligible).length,
    records: records.map(({ signature, ...record }) => record),
    findings,
    subjectGroups
  };
}

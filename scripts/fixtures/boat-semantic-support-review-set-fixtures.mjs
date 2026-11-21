export function review({ id, reviewer = 'reviewer-a', verdict = 'supported', unsafe = false } = {}) {
  const record = {
    schemaVersion: '1.0',
    reviewId: id,
    reviewStatus: 'completed',
    reviewer: {
      reviewerId: reviewer,
      role: 'fact_checker',
      independenceDisclosure: 'No known conflict declared for this fixture.',
      reviewedAt: '2026-10-11T00:00:00.000Z'
    },
    subject: {
      workflowRun: '12345',
      workflowSha: 'abcdef1234567',
      articleSha256: 'a'.repeat(64),
      claimReportSha256: 'b'.repeat(64),
      evidencePackSha256: 'c'.repeat(64),
      proposalId: 'proposal-golden-1'
    },
    claim: {
      claimIndex: 1,
      exactClaimText: 'The company announced the product on Monday.',
      proposedReplacement: 'The company announced the product on Monday.',
      sourceId: 'S1',
      passageId: 'S1-P1',
      sourceUrl: 'https://example.com/source',
      passageText: 'The company announced the product on Monday.'
    },
    assessment: {
      verdict,
      factualComponents: [{
        component: 'Announcement occurred Monday',
        support: 'direct',
        passageQuote: 'announced the product on Monday',
        explanation: 'The quoted wording directly states the event and date.'
      }],
      scopeAlignment: 'exact',
      temporalAlignment: 'aligned',
      attributionAlignment: 'aligned',
      uncertaintyPreserved: true,
      rationale: 'The cited passage directly supports the event and date; no additional factual detail is introduced.'
    },
    decision: {
      recommendation: 'accept_for_existing_gates',
      riskFlags: [],
      requiredFollowUp: 'Run existing gates; this record does not approve publication.'
    },
    safety: {
      semanticSupport: 'not_verified',
      approvalRequired: true,
      automaticApplication: unsafe,
      existingGatesStillRequired: true
    }
  };
  return record;
}

export const reviewSetFixtures = {
  duplicateIds: [
    review({ id: 'SSR-GOLD-001', reviewer: 'reviewer-a' }),
    review({ id: 'SSR-GOLD-001', reviewer: 'reviewer-a' })
  ],
  independentDisagreement: [
    review({ id: 'SSR-GOLD-101', reviewer: 'reviewer-a', verdict: 'supported' }),
    review({ id: 'SSR-GOLD-102', reviewer: 'reviewer-b', verdict: 'unsupported' })
  ],
  sameReviewerRepeat: [
    review({ id: 'SSR-GOLD-201', reviewer: 'reviewer-a', verdict: 'supported' }),
    review({ id: 'SSR-GOLD-202', reviewer: 'reviewer-a', verdict: 'unsupported' })
  ],
  invalidRecord: [
    review({ id: 'SSR-GOLD-301', reviewer: 'reviewer-a', unsafe: true }),
    review({ id: 'SSR-GOLD-302', reviewer: 'reviewer-b', verdict: 'unsupported' })
  ]
};

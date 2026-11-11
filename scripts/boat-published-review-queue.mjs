/**
 * Build a deterministic, read-only per-article review queue from existing BOAT audits.
 * This ranks review work; it never decides factual truth or authorizes article edits.
 */
export function buildPublishedReviewQueue({ articles, structural, evidence, lineage, duplicateSlugs = [] }) {
  const safe = value => Array.isArray(value) ? value : [];
  const structuralBySlug = new Map(safe(structural).map(item => [String(item?.slug ?? ''), item]));
  const evidenceBySlug = new Map(safe(evidence).map(item => [String(item?.slug ?? ''), item]));
  const lineageBySlug = new Map(safe(lineage).map(item => [String(item?.slug ?? ''), item]));
  const duplicateSet = new Set(safe(duplicateSlugs).map(item => String(item?.slug ?? '')));
  const records = safe(articles).map(article => {
    const slug = String(article?.slug ?? '');
    const title = String(article?.title ?? slug ?? 'Untitled article');
    const structure = structuralBySlug.get(slug) ?? {
      slug, title, findings: ['Structural audit result missing'], words: null, urls: 0,
      sourceHeading: false, emptyHeadings: null, repeatedParagraphs: null,
    };
    const evidenceRecord = evidenceBySlug.get(slug) ?? {
      slug, title, status: 'unknown', reportCount: 0, note: 'Evidence audit result missing.',
    };
    const lineageRecord = lineageBySlug.get(slug) ?? {
      slug, title, status: 'unknown', manifestRecords: 0, matchingRecords: 0,
      note: 'Lineage audit result missing.',
    };
    const identityAmbiguous = duplicateSet.has(slug);
    const structuralFindings = safe(structure.findings);
    const evidenceStatus = String(evidenceRecord.status ?? 'unknown');
    const lineageStatus = String(lineageRecord.status ?? 'unknown');
    const reasons = [];
    if (identityAmbiguous) reasons.push('Duplicate slug makes article identity ambiguous');
    if (evidenceStatus === 'historical-block') reasons.push('Historical claim-verification block exists');
    if (evidenceStatus === 'conflicting-history') reasons.push('Archived claim-verification outcomes conflict');
    if (lineageStatus === 'stale-manifest') reasons.push('Saved lineage manifest does not match current article bytes');
    if (structuralFindings.length) reasons.push(...structuralFindings);
    if (evidenceStatus === 'unknown') reasons.push('Current claim/evidence status is unknown');
    if (lineageStatus === 'unknown') reasons.push('Exact current-byte lineage is unknown');
    const priority = identityAmbiguous || evidenceStatus === 'historical-block' ||
      evidenceStatus === 'conflicting-history' || lineageStatus === 'stale-manifest'
      ? 'high'
      : structuralFindings.length || evidenceStatus === 'unknown' || lineageStatus === 'unknown'
        ? 'medium' : 'normal';
    const suggestedActions = [];
    if (identityAmbiguous) suggestedActions.push('Resolve duplicate slug identity before attaching evidence or proposing a repair.');
    if (structuralFindings.length) suggestedActions.push('Inspect the structural findings and confirm each source link and heading in the article.');
    if (evidenceStatus === 'historical-block' || evidenceStatus === 'conflicting-history') suggestedActions.push('Review the archived claim reports and preserve every conflicting outcome; do not select a winner automatically.');
    if (evidenceStatus === 'unknown') suggestedActions.push('Recover or generate a trustworthy claim/evidence record for the exact published version; otherwise keep status unknown.');
    if (lineageStatus === 'stale-manifest' || lineageStatus === 'unknown') suggestedActions.push('Reconcile exact article, claim-report, and evidence-pack hashes before treating any historical PASS as current.');
    if (!suggestedActions.length) suggestedActions.push('No structural or provenance gap was detected by these audits; a separate semantic claim/source review is still required.');
    return {
      slug, title, priority, reviewState: 'needs-human-review',
      identityAmbiguous,
      structural: {
        findingCount: structuralFindings.length, findings: structuralFindings,
        words: structure.words ?? null, urls: structure.urls ?? null,
        sourceHeading: structure.sourceHeading ?? null,
        emptyHeadings: structure.emptyHeadings ?? null,
        repeatedParagraphs: structure.repeatedParagraphs ?? null,
      },
      evidence: {
        status: evidenceStatus, reportCount: evidenceRecord.reportCount ?? 0,
        passReports: evidenceRecord.passReports ?? 0, blockedReports: evidenceRecord.blockedReports ?? 0,
        unknownReports: evidenceRecord.unknownReports ?? 0,
        evidencePackReports: evidenceRecord.evidencePackReports ?? 0,
        claimCount: evidenceRecord.claimCount ?? null, verified: evidenceRecord.verified ?? null,
        partial: evidenceRecord.partial ?? null, unsupported: evidenceRecord.unsupported ?? null,
        note: evidenceRecord.note ?? 'No evidence coverage note available.',
      },
      lineage: {
        status: lineageStatus, manifestRecords: lineageRecord.manifestRecords ?? 0,
        matchingRecords: lineageRecord.matchingRecords ?? 0,
        currentArticleSha256: lineageRecord.currentArticleSha256 ?? null,
        note: lineageRecord.note ?? 'No lineage coverage note available.',
      },
      reasons, suggestedActions,
      limits: [
        'Historical PASS is not current semantic verification.',
        'Exact-byte lineage proves recorded provenance only; it does not prove claim truth or source freshness.',
        'This queue is advisory and read-only; no article edits or publication decisions are authorized.',
      ],
    };
  });
  const rank = { high: 0, medium: 1, normal: 2 };
  records.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug));
  return {
    schemaVersion: 1,
    reportType: 'published-article-review-queue',
    readOnly: true,
    automaticRepair: false,
    automaticPublicationDecision: false,
    summary: {
      articles: records.length,
      highPriority: records.filter(item => item.priority === 'high').length,
      mediumPriority: records.filter(item => item.priority === 'medium').length,
      normalPriority: records.filter(item => item.priority === 'normal').length,
      needsHumanReview: records.filter(item => item.reviewState === 'needs-human-review').length,
      unknownEvidence: records.filter(item => item.evidence.status === 'unknown').length,
      unknownLineage: records.filter(item => item.lineage.status === 'unknown').length,
      staleLineage: records.filter(item => item.lineage.status === 'stale-manifest').length,
      duplicateSlugArticles: records.filter(item => item.identityAmbiguous).length,
      countsReconciled: true,
    },
    limitations: [
      'This is a triage queue assembled from structural, historical evidence-coverage, and exact-byte lineage audits.',
      'It does not fetch public web pages or independently verify claim-to-source support, source freshness, or factual truth.',
      'No priority means factual correctness; even normal-priority articles still require a semantic review.',
      'No article mutation, repair execution, or publishing decision is performed.',
    ],
    articles: records,
  };
}

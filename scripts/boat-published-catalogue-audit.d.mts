export type PublishedEvidenceArticleInput = { slug?: string; title?: string };
export type PublishedEvidenceCoverage = {
  slug: string; title: string; reportCount: number; passReports: number; blockedReports: number; unknownReports: number;
  claimCount: number | null; verified: number | null; partial: number | null; unsupported: number | null;
  evidencePackReports: number; status: 'unknown' | 'historical-pass' | 'historical-block' | 'conflicting-history'; note: string;
};
export function auditPublishedEvidenceCoverage(articles: PublishedEvidenceArticleInput[] | unknown, attemptsDirectory: string): PublishedEvidenceCoverage[];

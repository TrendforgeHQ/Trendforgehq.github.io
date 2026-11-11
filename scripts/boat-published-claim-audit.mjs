/**
 * Read-only claim-level audit over archived verifier reports for the current published catalogue.
 * This surfaces saved verifier outcomes and traceability; it does not independently fact-check.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const str = value => typeof value === 'string' ? value.trim() : '';
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const sha256 = raw => crypto.createHash('sha256').update(raw).digest('hex');
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const safePassages = claim => {
  const values = Array.isArray(claim?.matchedPassages) ? claim.matchedPassages : str(claim?.bestPassageId).split(',');
  return values.map(str).filter(Boolean);
};

export function auditPublishedClaims({ articles, attemptsDirectory, articlesDirectory, rootReportPath = null, rootMetadataPath = null }) {
  if (!Array.isArray(articles)) return {
    schemaVersion: 1, reportType: 'published-claim-level-audit', readOnly: true,
    summary: { articles: 0, articlesWithReports: 0, articlesWithoutReports: 0, archivedReports: 0, claims: 0, unsupported: 0, contradicted: 0, numericMismatch: 0, unknownClaims: 0 },
    articles: [], limitations: ['Invalid catalogue input; no claim-level conclusion is available.']
  };
  const publishedBySlug = new Map();
  for (const article of articles) {
    const slug = str(article?.slug);
    if (!slug) continue;
    if (!publishedBySlug.has(slug)) publishedBySlug.set(slug, []);
    publishedBySlug.get(slug).push(article);
  }
  const reportsBySlug = new Map();
  let attemptDirs = [];
  try { attemptDirs = fs.readdirSync(attemptsDirectory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => ({ name: entry.name, dir: path.join(attemptsDirectory, entry.name), sourceKind: 'archived-attempt' })); } catch {}
  if (rootReportPath && fs.existsSync(rootReportPath)) attemptDirs.push({ name: 'root-current-snapshot', dir: path.dirname(rootReportPath), reportPath: rootReportPath, metadataPath: rootMetadataPath, sourceKind: 'root-workflow-snapshot' });
  let archivedReports = 0;
  for (const dirent of attemptDirs) {
    const dir = dirent.dir ?? path.join(attemptsDirectory, dirent.name);
    const reportPath = dirent.reportPath ?? path.join(dir, 'claim-verification.json');
    if (!fs.existsSync(reportPath)) continue;
    const report = readJson(reportPath);
    const articlePath = str(report?.articlePath).replace(/^\.\//, '');
    const match = /^content\/articles\/([A-Za-z0-9._-]+)\.md$/.exec(articlePath);
    if (!match || match[1].includes('..') || !publishedBySlug.has(match[1])) continue;
    const slug = match[1];
    const metadataPath = dirent.metadataPath ?? path.join(dir, 'metadata.json');
    const metadata = readJson(metadataPath);
    const reportRaw = (() => { try { return fs.readFileSync(reportPath, 'utf8'); } catch { return ''; } })();
    const sourceById = new Map();
    for (const source of Array.isArray(report.sources) ? report.sources : []) {
      const id = str(source?.id ?? source?.sourceId);
      if (id && !sourceById.has(id)) sourceById.set(id, source);
    }
    const claimRows = [];
    const hasClaims = Array.isArray(report.claims);
    if (hasClaims) {
      report.claims.forEach((claim, index) => {
        const sourceId = str(claim?.sourceId ?? claim?.coreFactMatch?.sourceId);
        const source = sourceById.get(sourceId) ?? null;
        const sourceUrl = str(claim?.bestUrl ?? claim?.sourceUrl ?? source?.url) || null;
        const sourceTitle = str(claim?.bestSource ?? claim?.sourceTitle ?? source?.title) || null;
        const passageIds = safePassages(claim);
        const excerpt = str(claim?.evidence ?? claim?.bestPassage) || null;
        const claimText = str(claim?.claim);
        const unsupported = claim?.status === 'unsupported' || str(claim?.classification).startsWith('unsupported');
        const contradicted = claim?.contradicted === true || claim?.status === 'contradicted';
        const numericMismatch = claim?.numericMismatch === true;
        const contextComplete = Boolean(sourceId && sourceUrl && passageIds.length && excerpt);
        claimRows.push({
          claimIndex: Number.isInteger(claim?.index) ? claim.index : index + 1,
          claimText: claimText || null,
          savedVerifierStatus: str(claim?.status) || 'unknown',
          classification: str(claim?.classification) || null,
          confidence: Number.isFinite(Number(claim?.confidence)) ? Number(claim.confidence) : null,
          flags: { unsupported, contradicted, numericMismatch, offTopic: claim?.offTopic === true },
          source: { id: sourceId || null, title: sourceTitle, url: sourceUrl, role: str(claim?.sourceRole ?? claim?.coreFactMatch?.sourceRole) || null },
          passages: passageIds.map(passageId => ({ id: passageId, excerpt: excerpt ? excerpt.slice(0, 500) : null })),
          sourceContextStatus: contextComplete ? 'fields-present-not-validated' : 'unknown-missing-context',
          currentArticleTextStatus: 'not_checked',
          reviewStatus: unsupported || contradicted || numericMismatch ? 'review-required' : contextComplete ? 'historical-signal-only' : 'unknown',
          note: 'Saved report fields only. Source reachability, freshness, passage identity and semantic support have not been independently checked.'
        });
      });
    }
    const record = {
      attemptId: dirent.name,
      articlePath,
      reportPath: path.relative(process.cwd(), reportPath).split(path.sep).join('/'),
      metadataPath: fs.existsSync(metadataPath) ? path.relative(process.cwd(), metadataPath).split(path.sep).join('/') : null,
      sourceKind: dirent.sourceKind ?? 'archived-attempt',
      workflowRun: str(metadata?.workflowRun) || null,
      workflowSha: str(metadata?.workflowSha) || null,
      lifecycleStatus: str(metadata?.status) || 'unknown',
      reportPass: typeof report?.pass === 'boolean' ? report.pass : null,
      reportClaimCount: Number.isFinite(Number(report?.claimCount)) ? Number(report.claimCount) : (hasClaims ? report.claims.length : null),
      actualClaimRows: claimRows.length,
      reportSha256: reportRaw ? sha256(reportRaw) : null,
      reportShapeStatus: hasClaims ? 'claims-array-present' : 'unknown-missing-claims-array',
      claims: claimRows,
      note: dirent.sourceKind === 'root-workflow-snapshot' ? 'Root workflow snapshot is retained, but absent exact article/report/evidence hashes mean it is not proven to match the current published bytes.' : 'Archived attempt is retained as history. It is not assumed to describe the exact current published bytes.'
    };
    if (!reportsBySlug.has(slug)) reportsBySlug.set(slug, []);
    reportsBySlug.get(slug).push(record);
    archivedReports++;
  }

  const outputArticles = [...publishedBySlug.entries()].map(([slug, entries]) => {
    const article = entries[0];
    const title = str(article?.title) || slug;
    let currentRaw = null;
    try { currentRaw = fs.readFileSync(path.join(articlesDirectory, slug + '.md'), 'utf8'); } catch {}
    const currentHash = currentRaw === null ? null : sha256(currentRaw);
    const reportRows = reportsBySlug.get(slug) ?? [];
    for (const report of reportRows) {
      for (const claim of report.claims) {
        if (currentRaw === null) claim.currentArticleTextStatus = 'unknown-current-article-missing';
        else if (!claim.claimText) claim.currentArticleTextStatus = 'unknown-claim-text-missing';
        else if (normalize(currentRaw).includes(normalize(claim.claimText))) claim.currentArticleTextStatus = 'exact-normalized-text-found';
        else claim.currentArticleTextStatus = 'not-exactly-found-possible-version-or-segmentation-difference';
      }
    }
    const allClaims = reportRows.flatMap(report => report.claims);
    const count = predicate => allClaims.filter(predicate).length;
    const reportOutcomes = reportRows.map(report => report.reportPass === true ? 'historical-pass' : report.reportPass === false ? 'historical-block' : 'unknown');
    const conflictingHistory = new Set(reportOutcomes).size > 1;
    return {
      slug, title, duplicateSlugInCatalogue: entries.length > 1,
      currentArticlePath: path.relative(process.cwd(), path.join(articlesDirectory, slug + '.md')).split(path.sep).join('/'),
      currentArticleSha256: currentHash,
      status: !currentRaw ? 'unknown-current-article-missing' : !reportRows.length ? 'unknown-no-archived-claim-report' : conflictingHistory ? 'conflicting-historical-outcomes' : reportRows.some(r => r.reportPass === false) ? 'historical-block-present' : reportRows.every(r => r.reportPass === true) ? 'historical-pass-only' : 'unknown',
      archivedReportCount: reportRows.length,
      historicalPassReports: reportRows.filter(r => r.reportPass === true).length,
      historicalBlockedReports: reportRows.filter(r => r.reportPass === false).length,
      unknownOutcomeReports: reportRows.filter(r => r.reportPass === null).length,
      claims: allClaims.length,
      unsupportedClaims: count(c => c.flags.unsupported),
      contradictedClaims: count(c => c.flags.contradicted),
      numericMismatchClaims: count(c => c.flags.numericMismatch),
      missingSourceContextClaims: count(c => c.sourceContextStatus !== 'fields-present-not-validated'),
      claimsNotExactlyFoundInCurrentArticle: count(c => c.currentArticleTextStatus === 'not-exactly-found-possible-version-or-segmentation-difference'),
      reports: reportRows,
      note: 'Claim rows preserve archived outcomes and source/passage fields. Exact text search is a version/segmentation signal, not proof that a claim is absent or false.'
    };
  }).sort((a, b) => {
    const rank = value => value === 'conflicting-historical-outcomes' ? 0 : value === 'historical-block-present' ? 1 : value.startsWith('unknown') ? 2 : value === 'historical-pass-only' ? 3 : 4;
    return rank(a.status) - rank(b.status) || a.title.localeCompare(b.title);
  });
  const allClaims = outputArticles.flatMap(article => article.reports.flatMap(report => report.claims));
  const sum = key => outputArticles.reduce((total, article) => total + article[key], 0);
  return {
    schemaVersion: 1,
    reportType: 'published-claim-level-audit',
    readOnly: true,
    automaticRepair: false,
    automaticPublicationDecision: false,
    summary: {
      articles: outputArticles.length,
      articlesWithReports: outputArticles.filter(a => a.archivedReportCount > 0).length,
      articlesWithoutReports: outputArticles.filter(a => a.archivedReportCount === 0).length,
      archivedReports,
      claims: allClaims.length,
      unsupported: allClaims.filter(c => c.flags.unsupported).length,
      contradicted: allClaims.filter(c => c.flags.contradicted).length,
      numericMismatch: allClaims.filter(c => c.flags.numericMismatch).length,
      unknownClaims: allClaims.filter(c => c.reviewStatus === 'unknown').length,
      claimsNotExactlyFoundInCurrentArticle: allClaims.filter(c => c.currentArticleTextStatus.startsWith('not-exactly-found')).length,
      countsReconciled: true
    },
    articles: outputArticles,
    limitations: [
      'This audit reads archived claim-verifier reports and metadata; it does not run a new verifier or fetch public web sources.',
      'A historical PASS is not current verification. Conflicting historical outcomes are preserved; no latest-report winner is selected.',
      'Source URL/title, source ID, passage ID and excerpt are reported as saved metadata only. Passage IDs and excerpts are not independently resolved against a canonical evidence pack here.',
      'Exact normalized claim-text search is a diagnostic signal only; wording, paragraph boundaries, or segmentation can differ even when the underlying idea appears.',
      'No article is edited, no repair is applied, and no publishing decision is made.'
    ]
  };
}

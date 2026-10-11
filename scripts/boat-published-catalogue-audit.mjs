/**
 * Deterministic, read-only structural audit of the canonical published article index.
 * This does not verify semantic factual support, source freshness, or source reachability.
 * @param {Array<{slug?:string,title?:string,content?:string[],sources?:Array<{title?:string,url?:string}>}>} articles
 */
export function auditPublishedCatalogue(articles) {
  if (!Array.isArray(articles)) return [];
  return articles.map((article) => {
    const blocks = Array.isArray(article?.content) ? article.content.filter((x) => typeof x === 'string') : [];
    const body = blocks.join('\n\n');
    const sourceRecords = Array.isArray(article?.sources) ? article.sources : [];
    const sourceUrls = sourceRecords.map((source) => source?.url).filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
    const inlineUrls = body.match(/https?:\/\/[^\s)>"']+/gi) ?? [];
    const urls = [...sourceUrls, ...inlineUrls];
    const headings = body.split(/\r?\n/).filter((line) => /^#{1,6}\s*$/.test(line));
    const paragraphs = body.split(/\r?\n\s*\r?\n/).map((part) =>
      part.replace(/^#{1,6}\s+.*$/gm, '').replace(/^[-*+]\s+/gm, '').replace(/\s+/g, ' ').trim().toLowerCase()
    ).filter((part) => part.length >= 40 && !/^https?:\/\//.test(part));
    const seen = new Set();
    let repeatedParagraphs = 0;
    for (const paragraph of paragraphs) {
      if (seen.has(paragraph)) repeatedParagraphs++;
      seen.add(paragraph);
    }
    const sourceHeading = sourceRecords.length > 0;
    const words = body.replace(/!?(\[[^\]]*\])\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
    const findings = [];
    if (!sourceHeading) findings.push('No rendered Sources section');
    if (urls.length === 0) findings.push('No HTTP(S) source links found');
    if (headings.length) findings.push(`${headings.length} empty heading(s)`);
    if (repeatedParagraphs) findings.push(`${repeatedParagraphs} repeated paragraph(s)`);
    return {
      slug: typeof article?.slug === 'string' ? article.slug : '',
      title: typeof article?.title === 'string' && article.title.trim() ? article.title : (typeof article?.slug === 'string' ? article.slug : 'Untitled article'),
      words: words.length,
      urls: urls.length,
      sourceHeading,
      emptyHeadings: headings.length,
      repeatedParagraphs,
      findings,
    };
  }).sort((a, b) => (b.findings.length - a.findings.length) || a.title.localeCompare(b.title));
}

import fs from 'node:fs';
import path from 'node:path';

const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};

/**
 * Match published articles to archived claim reports by canonical articlePath.
 * This is historical artifact coverage, NOT proof that the report matches the exact
 * currently published bytes. Exact matching requires hashes that are not available
 * in the published article index.
 * @param {Array<{slug?:string,title?:string}>} articles
 * @param {string} attemptsDirectory
 */
export function auditPublishedEvidenceCoverage(articles, attemptsDirectory) {
  if (!Array.isArray(articles)) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(attemptsDirectory, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  } catch {
    return articles.map(article => ({
      slug: String(article?.slug ?? ''),
      title: String(article?.title ?? article?.slug ?? 'Untitled article'),
      reportCount: 0, passReports: 0, blockedReports: 0, unknownReports: 0,
      claimCount: null, verified: null, partial: null, unsupported: null,
      evidencePackReports: 0, status: 'unknown',
      note: 'Archived attempts directory is missing or unreadable; historical verification coverage is unknown.',
    }));
  }

  const reportsByPath = new Map();
  for (const entry of entries) {
    const dir = path.join(attemptsDirectory, entry.name);
    const report = readJson(path.join(dir, 'claim-verification.json'));
    const metadata = readJson(path.join(dir, 'metadata.json'));
    if (!report || typeof report.articlePath !== 'string' || !report.articlePath) continue;
    const key = report.articlePath.replace(/^\.\//, '');
    if (!reportsByPath.has(key)) reportsByPath.set(key, []);
    reportsByPath.get(key).push({
      report,
      metadata,
      hasEvidencePack: ['authoritative-evidence-pack.json', 'evidence-pack.json'].some(name => fs.existsSync(path.join(dir, name))),
    });
  }

  return articles.map(article => {
    const slug = String(article?.slug ?? '');
    const title = String(article?.title ?? slug ?? 'Untitled article');
    const key = `content/articles/${slug}.md`;
    const matches = reportsByPath.get(key) ?? [];
    const passReports = matches.filter(item => item.report.pass === true).length;
    const blockedReports = matches.filter(item => item.report.pass === false || item.metadata?.status === 'claim-verification-blocked').length;
    const unknownReports = matches.length - passReports - blockedReports;
    const claimCounts = matches.map(item => Number(item.report.claimCount)).filter(Number.isFinite);
    const verifiedCounts = matches.map(item => Number(item.report.verified)).filter(Number.isFinite);
    const partialCounts = matches.map(item => Number(item.report.partial)).filter(Number.isFinite);
    const unsupportedCounts = matches.map(item => Number(item.report.unsupported)).filter(Number.isFinite);
    const sum = values => values.length ? values.reduce((a, b) => a + b, 0) : null;
    let status = 'unknown';
    let note = 'No archived claim-verification report matches this article path; this is unknown, not a pass.';
    if (matches.length) {
      status = passReports && blockedReports ? 'conflicting-history' : blockedReports ? 'historical-block' : passReports ? 'historical-pass' : 'unknown';
      note = 'Historical report matched by articlePath only. Exact current published bytes are not hash-linked to this report; do not treat a historical PASS as current verification.';
      if (matches.length > 1) note += ` ${matches.length} archived attempts exist; conflicting outcomes are retained.`;
    }
    return {
      slug, title, reportCount: matches.length, passReports, blockedReports, unknownReports,
      claimCount: sum(claimCounts), verified: sum(verifiedCounts), partial: sum(partialCounts), unsupported: sum(unsupportedCounts),
      evidencePackReports: matches.filter(item => item.hasEvidencePack).length,
      status, note,
    };
  }).sort((a, b) => {
    const rank = value => value === 'conflicting-history' ? 0 : value === 'historical-block' ? 1 : value === 'unknown' ? 2 : 3;
    return rank(a.status) - rank(b.status) || a.title.localeCompare(b.title);
  });
}

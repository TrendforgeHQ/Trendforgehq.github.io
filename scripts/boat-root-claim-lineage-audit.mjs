#!/usr/bin/env node
/**
 * Read-only lineage audit for the current root claim report and canonical evidence-pack envelope.
 * Structural matches never imply semantic support; report/run pairing remains UNKNOWN without a report hash.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const parse = raw => { try { return { value: JSON.parse(raw), valid: true }; } catch { return { value: null, valid: false }; } };
const titleOfMarkdown = raw => {
  const match = String(raw ?? '').match(/^title:\s*["']([\s\S]*?)["']\s*$/m);
  return match ? text(match[1]) : '';
};
const readIfExists = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

export function auditRootClaimLineage({ reportRaw, packRaw, briefRaw = null, articleRaw = null, attemptRecords = [] }) {
  const reportParsed = typeof reportRaw === 'string' ? parse(reportRaw) : { value: null, valid: false };
  const packPresent = typeof packRaw === 'string';
  const packParsed = packPresent && packRaw.length > 0 ? parse(packRaw) : { value: null, valid: false };
  const briefParsed = typeof briefRaw === 'string' ? parse(briefRaw) : { value: null, valid: false };
  const report = reportParsed.value, pack = packParsed.value, brief = briefParsed.value;
  const claims = Array.isArray(report?.claims) ? report.claims : [];
  const candidates = Array.isArray(pack?.candidates) ? pack.candidates : [];
  const candidateTitle = text(brief?.brief?.title);
  const titleMatches = candidateTitle ? candidates.filter(c => text(c?.candidate?.title) === candidateTitle) : [];
  const candidate = titleMatches.length === 1 ? titleMatches[0] : null;
  const usableCandidate = Boolean(packParsed.valid && pack?.version === 1 && pack?.status === 'authoritative' && candidate && Array.isArray(candidate.sources));
  const sourceIndex = new Map();
  if (usableCandidate) for (const source of candidate.sources) {
    const id = text(source?.id ?? source?.sourceId);
    if (!id) continue;
    if (!sourceIndex.has(id)) sourceIndex.set(id, []);
    sourceIndex.get(id).push(source);
  }
  const articlePath = text(report?.articlePath).replace(/^\.\//, '');
  const articleTitle = titleOfMarkdown(articleRaw);
  const archiveMatch = attemptRecords.find(item => {
    const meta = item?.metadata;
    return text(meta?.articlePath).replace(/^\.\//, '') === articlePath
      && text(meta?.workflowRun) !== ''
      && typeof item.packRaw === 'string' && typeof packRaw === 'string'
      && sha256(item.packRaw) === sha256(packRaw);
  }) ?? null;
  const archivedArticleBytesMatchCurrent = Boolean(archiveMatch && typeof archiveMatch.articleRaw === 'string' && typeof articleRaw === 'string' && sha256(archiveMatch.articleRaw) === sha256(articleRaw));
  // The archived article and pack are run-bound, but no claim-report hash is present in that archive metadata.
  const packArticleRunBindingProven = Boolean(archiveMatch);
  const reportRunBindingProven = false;
  const rows = claims.map((claim, i) => {
    const sourceId = text(claim?.sourceId ?? claim?.coreFactMatch?.sourceId);
    const ids = [
      ...(Array.isArray(claim?.matchedPassages) ? claim.matchedPassages : []),
      ...text(claim?.bestPassageId).split(',')
    ].map(text).filter((v, j, all) => all.indexOf(v) === j);
    const matches = usableCandidate ? (sourceIndex.get(sourceId) ?? []) : [];
    const source = matches.length === 1 ? matches[0] : null;
    const urlMatches = Boolean(source && text(claim?.bestUrl) && text(claim.bestUrl) === text(source.url));
    const factIds = [
      text(claim?.coreFactMatch?.factId),
      ...(Array.isArray(claim?.provenanceFactMatches) ? claim.provenanceFactMatches.map(f => text(f?.factId)) : [])
    ].filter((v, j, all) => v && all.indexOf(v) === j);
    const facts = candidate?.evidenceBrief?.storyFactMap?.facts ?? [];
    const passageRows = ids.map(id => {
      if (!usableCandidate || !source) return { id, status: 'unknown-pack-binding', resolvedPassageId: null };
      if (id === sourceId + '-BODY') return { id, status: text(source.body) ? 'source-body-anchor-present-not-a-passage' : 'unknown-source-body-missing', resolvedPassageId: null };
      const normalized = id.startsWith(sourceId + '-') ? id.slice(sourceId.length + 1) : id;
      const direct = (candidate.evidenceBrief?.relevantPassages ?? []).find(p =>
        text(p?.sourceId) === sourceId && text(p?.passageId ?? p?.id) === normalized);
      if (direct) return { id, status: 'passage-id-resolved-fields-only', resolvedPassageId: sourceId + '-' + text(direct.passageId ?? direct.id) };
      const factAnchor = id.match(/^S\d+-FF(\d+)$/);
      if (factAnchor) {
        const fact = facts.find(f => factIds.includes(text(f?.factId)) && text(f?.sourceId) === sourceId && text(f?.passageId));
        if (fact) return { id, status: 'fact-anchor-resolved-fields-only', resolvedPassageId: text(fact.passageId), factId: text(fact.factId) };
      }
      const numbered = normalized.match(/^P(\d+)$/);
      if (numbered && Array.isArray(source.passages) && Number(numbered[1]) >= 1 && Number(numbered[1]) <= source.passages.length) {
        return { id, status: 'passage-id-resolved-fields-only', resolvedPassageId: sourceId + '-' + normalized };
      }
      return { id, status: 'unknown-passage-not-found', resolvedPassageId: null };
    });
    return {
      claimIndex: Number.isInteger(claim?.index) ? claim.index : i + 1,
      claimText: text(claim?.claim) || null,
      savedVerifierStatus: text(claim?.status) || 'unknown',
      savedClassification: text(claim?.classification) || null,
      sourceId: sourceId || null,
      sourceResolution: !sourceId ? 'unknown-source-id-missing'
        : !usableCandidate ? 'unknown-canonical-candidate-unresolved'
        : matches.length === 0 ? 'unknown-source-not-found'
        : matches.length > 1 ? 'unknown-source-id-duplicate'
        : 'source-id-resolved-fields-only',
      sourceUrlMatchesCandidate: urlMatches,
      localPackSourceIdMatch: usableCandidate ? matches.length === 1 : null,
      passageIds: ids,
      passageResolution: passageRows,
      factualSupport: 'not_assessed',
      note: 'Structural ID/URL matches do not establish that evidence semantically supports the claim.'
    };
  });
  const status = !reportParsed.valid || !Array.isArray(report?.claims) ? 'unknown-report-invalid-or-missing'
    : !packParsed.valid || !Array.isArray(pack?.candidates) ? 'unknown-canonical-pack-invalid-or-missing'
    : !candidateTitle || titleMatches.length !== 1 ? 'unknown-canonical-candidate-match'
    : !packArticleRunBindingProven ? 'unknown-pack-article-run-binding'
    : !reportRunBindingProven ? 'unknown-report-run-binding'
    : rows.some(r => r.sourceResolution.startsWith('unknown-') || r.passageResolution.some(p => p.status.startsWith('unknown-'))) ? 'attention-unresolved-identifiers'
    : 'identifiers-resolved-semantic-support-unknown';
  return {
    schemaVersion: 1, reportType: 'boat-root-claim-evidence-lineage', readOnly: true,
    automaticRepair: false, automaticPublicationDecision: false, status,
    artifacts: {
      reportPresent: reportParsed.valid, reportSha256: typeof reportRaw === 'string' ? sha256(reportRaw) : null,
      evidencePackPresent: packPresent, evidencePackValidJson: packParsed.valid,
      evidencePackSha256: typeof packRaw === 'string' ? sha256(packRaw) : null,
      evidencePackCandidateCount: candidates.length,
      articleBriefTitle: candidateTitle || null,
      candidateMatchCount: titleMatches.length,
      matchedCandidateTitle: candidate ? text(candidate.candidate.title) : null,
      matchedCandidateSourceCount: candidate?.sources?.length ?? null,
      articlePath: articlePath || null,
      articleTitle: articleTitle || null,
      articleTitleMatchesClaimReport: Boolean(articleTitle && text(report?.articleTitle) === articleTitle),
      packArticleRunBindingProven,
      matchedWorkflowRun: archiveMatch ? text(archiveMatch.metadata.workflowRun) : null,
      matchedWorkflowSha: archiveMatch ? text(archiveMatch.metadata.workflowSha) : null,
      archivedArticleBytesMatchCurrent,
      archivedPackBytesMatchCurrent: packArticleRunBindingProven,
      reportRunBindingProven,
      savedReportPass: typeof report?.pass === 'boolean' ? report.pass : null,
      savedClaimCount: Number.isFinite(Number(report?.claimCount)) ? Number(report.claimCount) : claims.length
    },
    summary: {
      claims: rows.length,
      sourceResolved: rows.filter(r => r.sourceResolution === 'source-id-resolved-fields-only').length,
      sourceUnresolved: rows.filter(r => r.sourceResolution.startsWith('unknown-')).length,
      sourceUrlsMatched: rows.filter(r => r.sourceUrlMatchesCandidate).length,
      passagesResolved: rows.reduce((n, r) => n + r.passageResolution.filter(p => p.status.endsWith('resolved-fields-only')).length, 0),
      bodyAnchorsOnly: rows.reduce((n, r) => n + r.passageResolution.filter(p => p.status === 'source-body-anchor-present-not-a-passage').length, 0),
      passagesUnresolved: rows.reduce((n, r) => n + r.passageResolution.filter(p => p.status.startsWith('unknown-')).length, 0)
    },
    claims: rows,
    limitations: [
      'The archived metadata binds the exact article and evidence-pack bytes to a workflow run, but it does not contain the claim-report hash; report-to-run pairing remains UNKNOWN.',
      'Source/passage/fact identifiers and URLs are structural traceability only; they do not prove semantic support or source freshness.',
      'No source URLs are fetched, no model/provider is called, and no article or publication state is changed.'
    ]
  };
}

function main() {
  const root = path.resolve(process.env.BOAT_AUDIT_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const dataDir = path.join(root, 'data');
  const reportRaw = readIfExists(path.join(dataDir, 'claim-verification.json'));
  const packRaw = readIfExists(path.join(dataDir, 'authoritative-evidence-pack.json'));
  const briefRaw = readIfExists(path.join(dataDir, 'article-brief.json'));
  const report = parse(reportRaw ?? '').value;
  const articlePath = text(report?.articlePath).replace(/^\.\//, '');
  const articleRaw = articlePath && /^content\/articles\/[A-Za-z0-9._-]+\.md$/.test(articlePath) && !articlePath.includes('..')
    ? readIfExists(path.join(root, articlePath)) : null;
  const attemptsDir = path.join(dataDir, 'article-attempts');
  const attemptRecords = [];
  if (fs.existsSync(attemptsDir)) for (const dir of fs.readdirSync(attemptsDir, { withFileTypes: true }).filter(x => x.isDirectory())) {
    const base = path.join(attemptsDir, dir.name);
    const metadataRaw = readIfExists(path.join(base, 'metadata.json'));
    const metadata = parse(metadataRaw ?? '').value;
    if (!metadata) continue;
    attemptRecords.push({
      metadata,
      articleRaw: readIfExists(path.join(base, 'article.md')),
      packRaw: readIfExists(path.join(base, 'authoritative-evidence-pack.json'))
    });
  }
  process.stdout.write(JSON.stringify(auditRootClaimLineage({ reportRaw, packRaw, briefRaw, articleRaw, attemptRecords }), null, 2) + String.fromCharCode(10));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

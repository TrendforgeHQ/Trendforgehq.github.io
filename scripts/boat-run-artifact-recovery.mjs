#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const sha256 = raw => createHash('sha256').update(raw).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const normalizePassage = value => text(value).normalize('NFC').replace(/\s+/g, ' ').trim();
function collapseRepeatedPassage(value) {
  const normalized = normalizePassage(value);
  const parts = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length >= 2 && parts.every(part => part === parts[0])) return parts[0];
  return null;
}
function resolveLegacyPassage(claim, packSources) {
  const sourceId = text(claim?.sourceId);
  const originalId = text(claim?.bestPassageId);
  const source = packSources.find(item => text(item?.id) === sourceId);
  const bestPassage = normalizePassage(claim?.bestPassage);
  const base = { claimIndex: Number.isFinite(Number(claim?.index)) ? Number(claim.index) : null, sourceId: sourceId || null, legacyPassageId: originalId || null, canonicalPassageId: null, method: null, status: 'unresolved' };
  if (!source || !bestPassage || !Array.isArray(source.passages)) return base;
  const find = candidate => source.passages
    .map((passage, index) => ({ passageId: sourceId + '-P' + (index + 1), text: normalizePassage(passage) }))
    .filter(item => item.text === candidate);
  let matches = find(bestPassage);
  let method = 'exact-normalized-text';
  if (!matches.length) {
    const collapsed = collapseRepeatedPassage(bestPassage);
    if (collapsed) {
      matches = find(collapsed);
      method = 'exact-after-collapsing-identical-repeated-sentences';
    }
  }
  if (matches.length === 1) return { ...base, canonicalPassageId: matches[0].passageId, method, status: 'resolved_unique' };
  if (matches.length > 1) return { ...base, method, status: 'ambiguous', matchingPassageIds: matches.map(item => item.passageId) };
  return base;
}
const finding = (code, severity, message, details = {}) => ({ code, severity, message, details });

export function auditRecoveredRunArtifacts({
  articleRaw,
  claimReportRaw,
  articleBriefRaw,
  evidencePackRaw,
  blockedMetadataRaw,
  generatedMetadataRaw,
  artifactRunId,
  artifactId,
  artifactName = null,
  evidencePackEntry = null,
  articleEntry = null,
  claimReportEntry = null
} = {}) {
  const findings = [];
  const hardErrors = [];
  const unknowns = [];
  const warnings = [];
  const add = (code, severity, message, details = {}) => {
    const item = finding(code, severity, message, details);
    findings.push(item);
    if (severity === 'high') hardErrors.push(item);
    else if (severity === 'unknown') unknowns.push(item);
    else warnings.push(item);
  };

  const rawInputs = {
    article: articleRaw,
    claimReport: claimReportRaw,
    articleBrief: articleBriefRaw,
    evidencePack: evidencePackRaw,
    blockedMetadata: blockedMetadataRaw,
    generatedMetadata: generatedMetadataRaw
  };
  for (const [name, raw] of Object.entries(rawInputs)) {
    if (typeof raw !== 'string') add('BR-INPUT-MISSING', 'unknown', 'Required recovered artifact bytes are missing.', { artifact: name });
  }

  const parse = (raw, name) => {
    if (typeof raw !== 'string') return null;
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
      return value;
    } catch (error) {
      add('BR-INVALID-JSON', 'unknown', 'Recovered artifact is not valid JSON.', { artifact: name, message: error.message });
      return null;
    }
  };
  const report = parse(claimReportRaw, 'claimReport');
  const brief = parse(articleBriefRaw, 'articleBrief');
  const packRoot = parse(evidencePackRaw, 'evidencePack');
  const blockedMetadata = parse(blockedMetadataRaw, 'blockedMetadata');
  const generatedMetadata = parse(generatedMetadataRaw, 'generatedMetadata');

  const runId = text(artifactRunId);
  const artifactIdText = String(artifactId ?? '').trim();
  if (!runId || !/^\d+$/.test(runId)) add('BR-ARTIFACT-RUN-ID-MISSING', 'unknown', 'A numeric GitHub Actions run ID is required.');
  if (!artifactIdText || !/^\d+$/.test(artifactIdText)) add('BR-ARTIFACT-ID-MISSING', 'unknown', 'A numeric GitHub Actions artifact ID is required.');

  if (blockedMetadata && blockedMetadata.status !== 'claim-verification-blocked') {
    add('BR-BLOCKED-METADATA-STATUS-MISMATCH', 'high', 'Recovery requires metadata explicitly marked claim-verification-blocked.', { actual: text(blockedMetadata.status) || null });
  }
  if (generatedMetadata && generatedMetadata.status !== 'generated-pending-verification') {
    add('BR-GENERATED-METADATA-STATUS-MISMATCH', 'high', 'Recovery requires the source attempt metadata explicitly marked generated-pending-verification.', { actual: text(generatedMetadata.status) || null });
  }
  if (blockedMetadata && generatedMetadata && runId) {
    for (const [label, metadata] of [['blockedMetadata', blockedMetadata], ['generatedMetadata', generatedMetadata]]) {
      if (text(metadata.workflowRun) !== runId) {
        add('BR-RUN-ID-MISMATCH', 'high', 'Artifact metadata run ID does not match the GitHub Actions run being recovered.', { artifact: label, expected: runId, actual: text(metadata.workflowRun) || null });
      }
    }
    const blockedSha = text(blockedMetadata.workflowSha);
    const generatedSha = text(generatedMetadata.workflowSha);
    if (!blockedSha || !generatedSha) {
      add('BR-WORKFLOW-SHA-MISSING', 'unknown', 'Both archived metadata records must contain workflowSha.');
    } else if (blockedSha !== generatedSha) {
      add('BR-WORKFLOW-SHA-MISMATCH', 'high', 'Generated and claim-blocked metadata refer to different source commits.', { blockedSha, generatedSha });
    }
    if (text(generatedMetadata.evidenceArtifact) !== 'authoritative-evidence-pack.json') {
      add('BR-EVIDENCE-ARTIFACT-DECLARATION-MISMATCH', 'high', 'Generated-attempt metadata does not declare the canonical evidence-pack filename.', { actual: text(generatedMetadata.evidenceArtifact) || null });
    }
    if (text(generatedMetadata.articlePath) && text(report?.articlePath) && text(generatedMetadata.articlePath) !== text(report.articlePath)) {
      add('BR-ARTICLE-PATH-MISMATCH', 'high', 'Generated-attempt metadata articlePath differs from the claim report articlePath.', { generatedArticlePath: generatedMetadata.articlePath, reportArticlePath: report.articlePath });
    }
  }

  if (!report || !Array.isArray(report.claims) || !Array.isArray(report.sources)) {
    add('BR-REPORT-SHAPE-INVALID', 'unknown', 'Claim report must contain sources[] and claims[].');
  }
  const briefTitle = text(brief?.brief?.title);
  if (!briefTitle) add('BR-BRIEF-TITLE-MISSING', 'unknown', 'Article brief does not contain brief.title.');
  if (!Array.isArray(packRoot?.candidates)) {
    add('BR-PACK-CANDIDATES-MISSING', 'unknown', 'Canonical evidence pack must use the observed root candidates[] shape.');
  }
  const candidateMatches = Array.isArray(packRoot?.candidates)
    ? packRoot.candidates.filter(item => text(item?.candidate?.title) === briefTitle)
    : [];
  let selectedPack = null;
  if (briefTitle && candidateMatches.length === 1) selectedPack = candidateMatches[0];
  else if (briefTitle && candidateMatches.length === 0) add('BR-CANDIDATE-NOT-FOUND', 'high', 'No canonical evidence-pack candidate exactly matches article-brief.json brief.title.', { briefTitle });
  else if (candidateMatches.length > 1) add('BR-CANDIDATE-AMBIGUOUS', 'high', 'Multiple evidence-pack candidates exactly match the article brief title.', { briefTitle, matchCount: candidateMatches.length });

  if (packRoot && (packRoot.version !== 1 || packRoot.status !== 'authoritative')) {
    add('BR-PACK-ROOT-NOT-AUTHORITATIVE', 'high', 'Evidence-pack root is not the expected authoritative version-1 envelope.', { version: packRoot.version ?? null, status: packRoot.status ?? null });
  }
  if (selectedPack) {
    if (selectedPack.version !== 1 || selectedPack.status !== 'authoritative' || !text(selectedPack?.candidate?.link) || !Array.isArray(selectedPack.sources)) {
      add('BR-SELECTED-CANDIDATE-INVALID', 'high', 'Selected evidence-pack candidate does not meet the authoritative candidate contract.');
    }
    const packSources = selectedPack.sources || [];
    const packById = new Map();
    for (const source of packSources) {
      const id = text(source?.id);
      if (!/^S\d+$/.test(id) || !text(source?.url) || !Array.isArray(source?.passages)) {
        add('BR-PACK-SOURCE-SHAPE-INVALID', 'high', 'Selected pack contains a source without a canonical ID, URL, or passages array.', { sourceId: id || null });
        continue;
      }
      if (packById.has(id)) add('BR-PACK-SOURCE-ID-DUPLICATE', 'high', 'Selected pack contains duplicate source IDs.', { sourceId: id });
      packById.set(id, source);
    }
    if (report && Array.isArray(report.sources)) {
      const reportById = new Map();
      for (const source of report.sources) {
        const id = text(source?.id ?? source?.sourceId);
        if (!id) {
          add('BR-REPORT-SOURCE-ID-MISSING', 'high', 'Claim report contains a source without an ID.');
          continue;
        }
        if (reportById.has(id)) add('BR-REPORT-SOURCE-ID-DUPLICATE', 'high', 'Claim report contains duplicate source IDs.', { sourceId: id });
        reportById.set(id, source);
        const packSource = packById.get(id);
        if (!packSource) add('BR-REPORT-SOURCE-NOT-IN-PACK', 'high', 'Claim report source ID is absent from the selected same-run candidate pack.', { sourceId: id });
        else {
          const reportUrl = text(source.url ?? source.bestUrl);
          const packUrl = text(packSource.url ?? packSource.finalUrl);
          if (!reportUrl || reportUrl !== packUrl) add('BR-SOURCE-URL-MISMATCH', 'high', 'Claim report and selected evidence pack disagree on a source URL.', { sourceId: id, reportUrl: reportUrl || null, packUrl: packUrl || null });
        }
      }
      for (const id of packById.keys()) {
        if (!reportById.has(id)) add('BR-PACK-SOURCE-NOT-IN-REPORT', 'medium', 'Canonical pack source was not listed in the claim report.', { sourceId: id });
      }
    }
    if (report && Array.isArray(report.claims)) {
      const unknownClaimSources = [...new Set(report.claims.map(claim => text(claim?.sourceId)).filter(id => id && !packById.has(id)))];
      for (const sourceId of unknownClaimSources) add('BR-CLAIM-SOURCE-NOT-IN-PACK', 'high', 'One or more claims reference a source absent from the selected pack.', { sourceId });
    }
  }

  let claimTextCoverage = { total: 0, exactTextFoundInArticle: 0, missingClaimIndexes: [] };
  if (typeof articleRaw === 'string' && report && Array.isArray(report.claims)) {
    claimTextCoverage.total = report.claims.length;
    for (const claim of report.claims) {
      const claimText = text(claim?.claim);
      if (claimText && articleRaw.includes(claimText)) claimTextCoverage.exactTextFoundInArticle++;
      else claimTextCoverage.missingClaimIndexes.push(Number.isFinite(Number(claim?.index)) ? Number(claim.index) : null);
    }
    if (claimTextCoverage.missingClaimIndexes.length) {
      add('BR-CLAIMS_NOT_ALL_IN_ARTICLE', 'medium', 'Some saved claim strings are not exact substrings of the recovered quarantined article; report/article binding is partial.', claimTextCoverage);
    }
    if (text(report.articleTitle) && !articleRaw.includes(text(report.articleTitle))) {
      add('BR-ARTICLE_TITLE_NOT_IN_ARTICLE', 'high', 'Claim report articleTitle does not appear in the recovered article text.', { articleTitle: report.articleTitle });
    }
  }

  const noncanonicalPassageIds = [];
  if (report && Array.isArray(report.claims)) {
    for (const claim of report.claims) {
      const id = text(claim?.bestPassageId);
      if (id && !/^S\d+-P\d+$/.test(id)) noncanonicalPassageIds.push({ claimIndex: claim.index ?? null, passageId: id });
    }
    if (noncanonicalPassageIds.length) {
      add('BR-LEGACY-PASSAGE-IDS', 'medium', 'Legacy bestPassageId values are preserved as-is; this recovery audit does not translate them into canonical passage IDs.', { count: noncanonicalPassageIds.length, samples: noncanonicalPassageIds.slice(0, 5) });
    }
  }

  const candidateSources = selectedPack?.sources || [];
  const passageRows = report && Array.isArray(report.claims)
    ? report.claims.map(claim => resolveLegacyPassage(claim, candidateSources))
    : [];
  const passageResolution = {
    totalClaims: passageRows.length,
    resolvedUnique: passageRows.filter(item => item.status === 'resolved_unique').length,
    ambiguous: passageRows.filter(item => item.status === 'ambiguous').length,
    unresolved: passageRows.filter(item => item.status === 'unresolved').length,
    resolvedPassagesAreSuggestionsOnly: true,
    appliedToClaimReport: false,
    claims: passageRows
  };
  if (passageResolution.ambiguous || passageResolution.unresolved) {
    add('BR-PASSAGE-RESOLUTION-PARTIAL', 'medium', 'Only unique exact-text passage matches are reported; ambiguous or missing matches remain unresolved and are not rewritten.', {
      totalClaims: passageResolution.totalClaims,
      resolvedUnique: passageResolution.resolvedUnique,
      ambiguous: passageResolution.ambiguous,
      unresolved: passageResolution.unresolved
    });
  }
  const missingRequired = unknowns.length > 0;
  const status = hardErrors.length ? 'blocked' : missingRequired ? 'unknown' : warnings.length ? 'recovered_with_warnings' : 'recovered';
  const rawHash = raw => typeof raw === 'string' ? sha256(raw) : null;
  return {
    schemaVersion: '1.0',
    engine: 'BOAT Run Artifact Recovery Audit',
    mode: 'offline-read-only',
    status,
    packRecoveryStatus: hardErrors.length ? 'blocked' : unknowns.length ? 'unknown' : selectedPack ? 'recovered' : 'unknown',
    semanticSupport: 'not_verified',
    automaticApplication: false,
    approvalRequired: true,
    artifact: {
      runId: runId || null,
      artifactId: artifactIdText || null,
      name: text(artifactName) || null,
      evidencePackEntry: text(evidencePackEntry) || null,
      articleEntry: text(articleEntry) || null,
      claimReportEntry: text(claimReportEntry) || null,
      workflowSha: text(generatedMetadata?.workflowSha) || null,
      membershipVerification: 'GitHub Actions artifact listing/download checked separately; CLI arguments record that context but do not independently query GitHub.'
    },
    candidate: selectedPack ? {
      title: text(selectedPack.candidate?.title),
      link: text(selectedPack.candidate?.link),
      sourceCount: candidateSources.length,
      sourceIds: candidateSources.map(source => text(source.id))
    } : null,
    report: report ? {
      articleTitle: text(report.articleTitle) || null,
      articlePath: text(report.articlePath) || null,
      claimCount: Array.isArray(report.claims) ? report.claims.length : null,
      reportSourceCount: Array.isArray(report.sources) ? report.sources.length : null,
      claimTextCoverage
    } : null,
    passageIdAudit: {
      status: noncanonicalPassageIds.length ? 'legacy_or_noncanonical' : 'canonical_or_missing',
      noncanonicalCount: noncanonicalPassageIds.length,
      valuesPreserved: true
    },
    passageResolution,
    hashes: {
      method: 'computed-from-recovered-bytes',
      hashesRecordedAtGeneration: false,
      articleSha256: rawHash(articleRaw),
      claimReportSha256: rawHash(claimReportRaw),
      articleBriefSha256: rawHash(articleBriefRaw),
      evidencePackEnvelopeSha256: rawHash(evidencePackRaw),
      blockedMetadataSha256: rawHash(blockedMetadataRaw),
      generatedMetadataSha256: rawHash(generatedMetadataRaw)
    },
    findings,
    limitations: [
      'Hashes in this manifest are computed from recovered bytes; they were not recorded by the original workflow at generation time.',
      'Run/artifact membership is supplied from the separately inspected GitHub Actions artifact listing and is not independently fetched by this offline module.',
      'Matching source IDs and URLs proves metadata lineage only, not semantic support for a claim.',
      'Legacy passage identifiers are never rewritten; claim-level passage alignment requires a separate exact-text audit.',
      'This module never edits or applies changes to an article and never runs providers or publishing.'
    ]
  };
}

function read(file) { return fs.readFileSync(file, 'utf8'); }
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error('Unexpected argument: ' + argv[i]);
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for --' + key);
    args[key] = argv[++i];
  }
  return args;
}
export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const required = ['article','report','brief','pack','blocked-metadata','generated-metadata','artifact-run-id','artifact-id','output'];
  for (const key of required) if (!args[key]) throw new Error('Required argument --' + key);
  const inputPaths = ['article','report','brief','pack','blocked-metadata','generated-metadata'].map(key => path.resolve(args[key]));
  const outputPath = path.resolve(args.output);
  if (inputPaths.includes(outputPath)) throw new Error('Refusing to overwrite an input file');
  if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite an existing output file');
  const result = auditRecoveredRunArtifacts({
    articleRaw: read(args.article),
    claimReportRaw: read(args.report),
    articleBriefRaw: read(args.brief),
    evidencePackRaw: read(args.pack),
    blockedMetadataRaw: read(args['blocked-metadata']),
    generatedMetadataRaw: read(args['generated-metadata']),
    artifactRunId: args['artifact-run-id'],
    artifactId: args['artifact-id'],
    artifactName: args['artifact-name'] || null,
    evidencePackEntry: args['evidence-pack-entry'] || null,
    articleEntry: args['article-entry'] || null,
    claimReportEntry: args['claim-report-entry'] || null
  });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ status: result.status, packRecoveryStatus: result.packRecoveryStatus, outputPath, findingCount: result.findings.length, automaticApplication: false }) + '\n');
  return result.status === 'blocked' ? 1 : result.status === 'unknown' ? 2 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = runCli(); }
  catch (error) { process.stderr.write('BOAT Run Artifact Recovery Audit error: ' + error.message + '\n'); process.exitCode = 2; }
}

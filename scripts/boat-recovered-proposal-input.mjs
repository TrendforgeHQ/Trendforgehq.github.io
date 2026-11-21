#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const hash = raw => createHash('sha256').update(raw).digest('hex');
const s = value => typeof value === 'string' ? value.trim() : '';
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finding = (code, severity, message, details = {}) => ({ code, severity, message, details });

function parse(raw, label, findings) {
  if (typeof raw !== 'string') {
    findings.push(finding('BPI-INPUT-MISSING', 'unknown', 'Required recovered bytes are missing.', { artifact: label }));
    return null;
  }
  try {
    const value = JSON.parse(raw);
    if (!obj(value)) throw new Error('Expected a JSON object');
    return value;
  } catch (error) {
    findings.push(finding('BPI-INVALID-JSON', 'unknown', 'Artifact JSON could not be parsed.', { artifact: label, detail: error.message }));
    return null;
  }
}

export function buildRecoveredProposalInputs({ recoveryAudit, articleRaw, claimReportRaw, articleBriefRaw, evidencePackRaw, runMetadataRaw = null, generatedAt = '2000-01-01T00:00:00.000Z' } = {}) {
  const findings = [];
  const add = (code, severity, message, details = {}) => findings.push(finding(code, severity, message, details));
  const report = parse(claimReportRaw, 'claimReport', findings);
  const brief = parse(articleBriefRaw, 'articleBrief', findings);
  const packRoot = parse(evidencePackRaw, 'evidencePack', findings);
  const handoffFindings = [];
  const runMetadata = typeof runMetadataRaw === 'string'
    ? parse(runMetadataRaw, 'runMetadata', handoffFindings)
    : null;

  if (!obj(recoveryAudit)) add('BPI-RECOVERY-AUDIT-MISSING', 'unknown', 'A structured recovery audit is required.');
  if (typeof articleRaw !== 'string') add('BPI-ARTICLE-MISSING', 'unknown', 'Exact recovered article bytes are required.');
  if (!report || !Array.isArray(report.claims) || !Array.isArray(report.sources)) add('BPI-REPORT-SHAPE', 'unknown', 'Claim report must contain sources[] and claims[].');
  if (!s(brief?.brief?.title)) add('BPI-BRIEF-TITLE-MISSING', 'unknown', 'The exact article brief title is required.');
  if (!Array.isArray(packRoot?.candidates)) add('BPI-PACK-CANDIDATES-MISSING', 'unknown', 'Canonical pack must contain candidates[].');

  if (obj(recoveryAudit)) {
    if (!['recovered', 'recovered_with_warnings'].includes(recoveryAudit.status) || recoveryAudit.packRecoveryStatus !== 'recovered') {
      add('BPI-RECOVERY-NOT-CLEAR', recoveryAudit.status === 'blocked' || recoveryAudit.packRecoveryStatus === 'blocked' ? 'high' : 'unknown',
        'Recovery audit is not in a state that permits proposal inputs.', { status: recoveryAudit.status ?? null, packRecoveryStatus: recoveryAudit.packRecoveryStatus ?? null });
    }
    if (recoveryAudit.semanticSupport !== 'not_verified' || recoveryAudit.automaticApplication !== false || recoveryAudit.approvalRequired !== true) {
      add('BPI-REVIEW-GUARDRAIL-MISMATCH', 'high', 'Recovery audit must leave semantic support unverified, require human approval, and prohibit automatic application.');
    }
    if (!/^\d+$/.test(s(recoveryAudit?.artifact?.runId)) || !/^\d+$/.test(s(recoveryAudit?.artifact?.artifactId))) {
      add('BPI-ARTIFACT-IDENTITY-MISSING', 'unknown', 'Numeric run and artifact IDs are required.');
    }
    if (recoveryAudit?.hashes?.method !== 'computed-from-recovered-bytes' || recoveryAudit?.hashes?.hashesRecordedAtGeneration !== false) {
      add('BPI-HASH-PROVENANCE-UNSAFE', 'high', 'Checksums must be labelled recovery-time hashes, not original generation-time hashes.');
    }
  }

  for (const [key, raw] of [
    ['articleSha256', articleRaw],
    ['claimReportSha256', claimReportRaw],
    ['articleBriefSha256', articleBriefRaw],
    ['evidencePackEnvelopeSha256', evidencePackRaw]
  ]) {
    const expected = recoveryAudit?.hashes?.[key];
    if (typeof raw !== 'string' || !s(expected)) add('BPI-RECOVERY-HASH-MISSING', 'unknown', 'A recovery-time checksum or raw artifact is missing.', { key });
    else if (hash(raw) !== expected) add('BPI-RECOVERY-HASH-MISMATCH', 'high', 'Recovered bytes differ from the bytes covered by the recovery audit.', { key });
  }

  const briefTitle = s(brief?.brief?.title);
  const candidates = Array.isArray(packRoot?.candidates) ? packRoot.candidates.filter(c => s(c?.candidate?.title) === briefTitle) : [];
  let selected = null;
  if (briefTitle && candidates.length !== 1) add(candidates.length ? 'BPI-CANDIDATE-AMBIGUOUS' : 'BPI-CANDIDATE-NOT-FOUND', 'high',
    'The brief title must select exactly one candidate.', { briefTitle, matchCount: candidates.length });
  else if (candidates.length === 1) {
    selected = candidates[0];
    if (selected.version !== 1 || selected.status !== 'authoritative' || !s(selected?.candidate?.link) || !Array.isArray(selected.sources)) {
      add('BPI-CANDIDATE-NOT-AUTHORITATIVE', 'high', 'Selected candidate does not satisfy the authoritative pack contract.');
    }
    if (s(recoveryAudit?.candidate?.title) !== briefTitle || s(recoveryAudit?.candidate?.link) !== s(selected?.candidate?.link)) {
      add('BPI-AUDIT-CANDIDATE-MISMATCH', 'high', 'Selected candidate differs from the candidate in the recovery audit.');
    }
  }

  const packSources = Array.isArray(selected?.sources) ? selected.sources : [];
  const packById = new Map();
  for (const source of packSources) {
    const id = s(source?.id);
    if (!/^S\d+$/.test(id) || !s(source?.url) || !Array.isArray(source?.passages)) {
      add('BPI-PACK-SOURCE-SHAPE', 'high', 'Selected pack contains a malformed source.', { sourceId: id || null });
      continue;
    }
    if (packById.has(id)) add('BPI-PACK-SOURCE-DUPLICATE', 'high', 'Selected pack contains duplicate source IDs.', { sourceId: id });
    packById.set(id, source);
  }

  const reportSources = new Map();
  if (report && Array.isArray(report.sources)) {
    for (const source of report.sources) {
      const id = s(source?.id ?? source?.sourceId);
      if (!id || reportSources.has(id)) {
        add('BPI-REPORT-SOURCE-ID', 'high', 'Claim report source IDs must be present and unique.', { sourceId: id || null });
        continue;
      }
      reportSources.set(id, source);
      const packSource = packById.get(id);
      const reportUrl = s(source?.url ?? source?.bestUrl);
      if (!packSource || !reportUrl || reportUrl !== s(packSource.url ?? packSource.finalUrl)) {
        add('BPI-SOURCE-LINEAGE-MISMATCH', 'high', 'Report source ID/URL does not exactly match the selected pack.', {
          sourceId: id, reportUrl: reportUrl || null, packUrl: s(packSource?.url ?? packSource?.finalUrl) || null
        });
      }
    }
  }

  const resolutionByIndex = new Map();
  for (const row of Array.isArray(recoveryAudit?.passageResolution?.claims) ? recoveryAudit.passageResolution.claims : []) {
    const key = String(row?.claimIndex ?? '');
    if (!key) continue;
    resolutionByIndex.set(key, resolutionByIndex.has(key) ? { ...row, status: 'ambiguous' } : row);
  }

  const claims = [];
  const seenIndexes = new Set();
  if (report && Array.isArray(report.claims)) for (const claim of report.claims) {
    const index = Number(claim?.index), key = String(index), claimText = s(claim?.claim), sourceId = s(claim?.sourceId);
    const claimFindings = [];
    const cadd = (code, status, message, details = {}) => claimFindings.push({ code, status, message, details });
    let status = 'ready_for_human_proposal';

    if (!Number.isInteger(index) || seenIndexes.has(key)) {
      status = 'blocked';
      cadd('BPI-CLAIM-INDEX-INVALID', 'blocked', 'Claim index must be an integer and unique.', { index: claim?.index ?? null });
    }
    seenIndexes.add(key);
    if (!claimText || typeof articleRaw !== 'string' || !articleRaw.includes(claimText)) {
      status = 'blocked';
      cadd('BPI-CLAIM-NOT-IN-ARTICLE', 'blocked', 'Exact saved claim text is not present in the recovered article.', { claimIndex: Number.isInteger(index) ? index : null });
    }

    const source = packById.get(sourceId);
    const reportSource = reportSources.get(sourceId);
    const reportUrl = s(reportSource?.url ?? reportSource?.bestUrl);
    const claimUrl = s(claim?.bestUrl ?? claim?.sourceUrl);
    const packUrl = s(source?.url ?? source?.finalUrl);
    if (!source || !reportSource || !packUrl || reportUrl !== packUrl || (claimUrl && claimUrl !== packUrl)) {
      status = 'blocked';
      cadd('BPI-CLAIM-SOURCE-LINEAGE', 'blocked', 'Claim source ID/URL must match both the report and selected pack.', {
        sourceId: sourceId || null, reportUrl: reportUrl || null, claimUrl: claimUrl || null, packUrl: packUrl || null
      });
    }

    const resolution = resolutionByIndex.get(key);
    const passageId = s(resolution?.canonicalPassageId);
    const passageIdValid = /^S\d+-P\d+$/.test(passageId) && passageId.startsWith(sourceId + '-P');
    if (!resolution || resolution.status !== 'resolved_unique' || s(resolution.sourceId) !== sourceId || !passageIdValid) {
      if (status !== 'blocked') status = 'unknown';
      cadd(resolution?.status === 'ambiguous' ? 'BPI-PASSAGE-AMBIGUOUS' : 'BPI-PASSAGE-UNRESOLVED',
        status === 'blocked' ? 'blocked' : 'unknown', 'A unique exact-text passage mapping from this claim source is required.',
        { sourceId: sourceId || null, resolutionStatus: resolution?.status ?? 'missing' });
    }

    let passageText = null;
    if (source && resolution?.status === 'resolved_unique' && s(resolution.sourceId) === sourceId && passageIdValid) {
      const passageNumber = Number(passageId.match(/-P(\d+)$/)?.[1]);
      if (passageNumber >= 1 && passageNumber <= source.passages.length) passageText = source.passages[passageNumber - 1];
      else {
        if (status !== 'blocked') status = 'unknown';
        cadd('BPI-PASSAGE-NOT-IN-PACK', 'unknown', 'Resolved passage ID does not point to a saved pack passage.', { passageId });
      }
    }
    if (status === 'ready_for_human_proposal' && !passageText) {
      status = 'unknown';
      cadd('BPI-PASSAGE-TEXT-MISSING', 'unknown', 'Canonical passage text could not be read from the selected pack.');
    }

    claims.push({
      claimIndex: Number.isInteger(index) ? index : null,
      status,
      originalClaim: claimText || null,
      source: source ? { sourceId, url: packUrl, title: s(source.title) || null } : null,
      passage: passageText ? { canonicalPassageId: passageId, text: passageText, mappingMethod: s(resolution.method), mappingIsSuggestionOnly: true } : null,
      findings: claimFindings
    });
  }

  const hardErrors = findings.some(item => item.severity === 'high');
  const unknowns = findings.some(item => item.severity === 'unknown');
  const eligible = claims.filter(item => item.status === 'ready_for_human_proposal').length;
  const status = hardErrors ? 'blocked' : unknowns ? 'unknown' : eligible ? 'ready_with_restrictions' : 'no_eligible_claims';
  const expectedOriginalHashes = {
    articleSha256: typeof articleRaw === 'string' ? hash(articleRaw) : '',
    claimReportSha256: typeof claimReportRaw === 'string' ? hash(claimReportRaw) : '',
    evidencePackSha256: typeof evidencePackRaw === 'string' ? hash(evidencePackRaw) : ''
  };
  const engineSources = Array.isArray(packRoot?.sources) ? packRoot.sources : [];
  const rootSourcesCompatible = Array.isArray(packRoot?.sources) &&
    engineSources.length === packSources.length &&
    packSources.every(source => {
      const engineSource = engineSources.find(item => s(item?.id) === s(source?.id));
      return !!engineSource &&
        s(engineSource.url ?? engineSource.finalUrl) === s(source.url ?? source.finalUrl) &&
        JSON.stringify(engineSource.passages) === JSON.stringify(source.passages);
    });
  const candidateEnvelopeCompatible = !!selected &&
    selected.status === 'authoritative' &&
    Array.isArray(selected.sources) &&
    s(selected?.candidate?.title) === briefTitle &&
    s(selected?.candidate?.link) === s(recoveryAudit?.candidate?.link);
  const proposalEnginePackCompatible = candidateEnvelopeCompatible &&
    (!Array.isArray(packRoot?.sources) || rootSourcesCompatible);
  const metadataBytesMatch = typeof runMetadataRaw === 'string' && !!s(recoveryAudit?.hashes?.blockedMetadataSha256) && hash(runMetadataRaw) === s(recoveryAudit.hashes.blockedMetadataSha256);
  const runIdMatches = !!runMetadata && s(runMetadata.workflowRun) === s(recoveryAudit?.artifact?.runId);
  const workflowShaMatches = !!runMetadata && s(runMetadata.workflowSha) === s(recoveryAudit?.artifact?.workflowSha);
  const metadataStatusEligible = !!runMetadata && runMetadata.status === 'claim-verification-blocked';
  const originalHashesMatch = !!runMetadata &&
    runMetadata.hashesRecordedInWorkflow === true &&
    Object.entries(expectedOriginalHashes).every(([key, actual]) => !!actual && !!s(runMetadata[key]) && s(runMetadata[key]) === actual);
  const handoffAllowed = metadataBytesMatch && metadataStatusEligible && runIdMatches && workflowShaMatches && originalHashesMatch && proposalEnginePackCompatible && handoffFindings.length === 0;
  return {
    schemaVersion: '1.0',
    engine: 'BOAT Recovered Proposal-Input Adapter',
    mode: 'offline-read-only',
    status,
    generatedAt,
    candidate: recoveryAudit?.candidate ? {
      title: s(recoveryAudit.candidate.title) || null,
      link: s(recoveryAudit.candidate.link) || null,
      sourceIds: Array.isArray(recoveryAudit.candidate.sourceIds) ? recoveryAudit.candidate.sourceIds : []
    } : null,
    artifact: {
      runId: s(recoveryAudit?.artifact?.runId) || null,
      artifactId: s(recoveryAudit?.artifact?.artifactId) || null,
      artifactName: s(recoveryAudit?.artifact?.name) || null,
      recoveryAuditStatus: recoveryAudit?.status ?? 'missing',
      membershipVerification: s(recoveryAudit?.artifact?.membershipVerification) || null
    },
    hashes: {
      provenance: 'recovery-time-computed-checksums',
      recordedAtGeneration: false,
      articleSha256: recoveryAudit?.hashes?.articleSha256 ?? null,
      claimReportSha256: recoveryAudit?.hashes?.claimReportSha256 ?? null,
      articleBriefSha256: recoveryAudit?.hashes?.articleBriefSha256 ?? null,
      evidencePackEnvelopeSha256: recoveryAudit?.hashes?.evidencePackEnvelopeSha256 ?? null,
      verifiedAgainstCurrentBytes: !hardErrors && !unknowns
    },
    counts: {
      totalClaims: claims.length,
      eligible,
      blocked: claims.filter(item => item.status === 'blocked').length,
      unknown: claims.filter(item => item.status === 'unknown').length
    },
    claims,
    findings,
    approvalRequired: true,
    automaticApplication: false,
    semanticSupport: 'not_verified',
    replacementTextGenerated: false,
    proposalEngineHandoff: {
      status: handoffAllowed ? 'ready' : 'blocked',
      allowed: handoffAllowed,
      reason: handoffAllowed
        ? 'Workflow metadata contains matching article/report/evidence-pack hashes and matching run/SHA identifiers.'
        : 'Original generation-time hash fields and matching same-run metadata are absent or do not match; recovery-time hashes cannot substitute.',
      checks: {
        metadataPresent: !!runMetadata,
        metadataBytesMatch,
        hashesRecordedInWorkflow: runMetadata?.hashesRecordedInWorkflow === true,
        runIdMatches,
        workflowShaMatches,
        artifactHashesMatch: originalHashesMatch,
        proposalEnginePackCompatible,
        metadataParseValid: handoffFindings.length === 0
      }
    },
    limitations: [
      'This adapter emits validated inputs only; it does not author replacement text or create/apply a factual correction.',
      'Checksums are computed from recovered bytes and were not recorded by the original workflow at generation time.',
      'Artifact membership comes from the separately inspected recovery audit; this offline module does not query GitHub.',
      'Matching source IDs, URLs, and passages establishes traceability only, not semantic support.',
      'Every ready input still requires a human-authored proposal, the review checklist, and existing verifier/editorial gates.'
    ]
  };
}

function read(file) { return fs.readFileSync(file, 'utf8'); }
function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!key?.startsWith('--') || !value) throw new Error('Expected --recovery-audit FILE --article FILE --claim-report FILE --brief FILE --pack FILE --output FILE');
    args[key.slice(2)] = value;
  }
  for (const key of ['recovery-audit', 'article', 'claim-report', 'brief', 'pack', 'output']) if (!args[key]) throw new Error('Missing required --' + key);
  const inputs = ['recovery-audit', 'article', 'claim-report', 'brief', 'pack', 'run-metadata'].filter(key => args[key]).map(key => path.resolve(args[key]));
  const output = path.resolve(args.output);
  if (inputs.includes(output) || fs.existsSync(output)) throw new Error('Output must be a new path and must not overwrite an input.');
  const result = buildRecoveredProposalInputs({
    recoveryAudit: JSON.parse(read(args['recovery-audit'])),
    articleRaw: read(args.article), claimReportRaw: read(args['claim-report']),
    articleBriefRaw: read(args.brief), evidencePackRaw: read(args.pack),
    runMetadataRaw: args['run-metadata'] ? read(args['run-metadata']) : null
  });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ status: result.status, ...result.counts, output, automaticApplication: false }) + '\n');
  if (!['ready_with_restrictions', 'no_eligible_claims'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write('BOAT Recovered Proposal-Input Adapter error: ' + error.message + '\n'); process.exitCode = 2; }
}

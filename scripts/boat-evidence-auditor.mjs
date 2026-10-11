#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const normalizeUrl = value => {
  try {
    const url = new URL(value);
    url.hash = '';
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString();
  } catch { return text(value); }
};
const finding = (code, severity, message, claimIndex = null, details = {}) => ({
  code, severity, message, claimIndex, details
});

export function auditEvidenceLineage({
  claimReport, evidencePack, metadata, claimReportRaw, evidencePackRaw,
  claimReportPath = null, evidencePackPath = null, metadataPath = null,
  generatedAt = '2000-01-01T00:00:00.000Z'
} = {}) {
  const findings = [];
  const integrity = [];
  const add = (item, isIntegrity = false) => {
    findings.push(item);
    if (isIntegrity) integrity.push(item);
  };

  if (!claimReport || !Array.isArray(claimReport.claims)) {
    add(finding('EA-INPUT-CLAIMS-MISSING', 'high', 'Claim report is missing or has no claims array.'), true);
  }
  if (!evidencePack || !Array.isArray(evidencePack.sources)) {
    add(finding('EA-INPUT-PACK-MISSING', 'high', 'Evidence pack is missing or has no sources array.'), true);
  }
  if (!metadata || typeof metadata !== 'object') {
    add(finding('EA-INPUT-METADATA-MISSING', 'high', 'Run metadata is required to establish artifact lineage.'), true);
  }

  if (claimReport && evidencePack && metadata && Array.isArray(claimReport.claims) && Array.isArray(evidencePack.sources)) {
    const expectedPackHash = text(metadata.evidencePackSha256);
    const expectedReportHash = text(metadata.claimReportSha256);
    if (!expectedPackHash || !expectedReportHash || typeof evidencePackRaw !== 'string' || typeof claimReportRaw !== 'string') {
      add(finding('EA-LINEAGE-HASH-MISSING', 'high', 'Exact artifact pairing cannot be proven: metadata must contain evidencePackSha256 and claimReportSha256 for the supplied raw files.'), true);
    } else {
      if (sha256(evidencePackRaw) !== expectedPackHash) {
        add(finding('EA-PACK-HASH-MISMATCH', 'high', 'Evidence pack hash does not match run metadata.'), true);
      }
      if (sha256(claimReportRaw) !== expectedReportHash) {
        add(finding('EA-REPORT-HASH-MISMATCH', 'high', 'Claim report hash does not match run metadata.'), true);
      }
    }

    const runId = text(metadata.workflowRun);
    if (!runId) add(finding('EA-RUN-ID-MISSING', 'high', 'Run metadata has no workflowRun identifier.'), true);
    const reportRun = text(claimReport.workflowRun ?? claimReport.metadata?.workflowRun);
    const packRun = text(evidencePack.workflowRun ?? evidencePack.metadata?.workflowRun);
    if (reportRun && runId && reportRun !== runId) {
      add(finding('EA-REPORT-RUN-MISMATCH', 'high', 'Claim report workflow run differs from metadata.', null, { metadataRun: runId, reportRun }), true);
    }
    if (packRun && runId && packRun !== runId) {
      add(finding('EA-PACK-RUN-MISMATCH', 'high', 'Evidence pack workflow run differs from metadata.', null, { metadataRun: runId, packRun }), true);
    }
    if (reportRun && packRun && reportRun !== packRun) {
      add(finding('EA-ARTIFACT-RUN-MISMATCH', 'high', 'Claim report and evidence pack identify different workflow runs.', null, { reportRun, packRun }), true);
    }

    const sourcesById = new Map();
    const passagesBySource = new Map();
    for (const source of evidencePack.sources) {
      const id = text(source?.id);
      if (!id) {
        add(finding('EA-PACK-SOURCE-ID-MISSING', 'high', 'Evidence pack contains a source without an ID.'), true);
        continue;
      }
      if (!sourcesById.has(id)) sourcesById.set(id, []);
      sourcesById.get(id).push(source);
      const ids = new Set();
      if (Array.isArray(source.passages)) source.passages.forEach((_, index) => ids.add(`${id}-P${index + 1}`));
      const relevant = evidencePack.evidenceBrief?.relevantPassages;
      if (Array.isArray(relevant)) {
        for (const passage of relevant) {
          if (text(passage?.sourceId) === id) {
            const passageId = text(passage?.passageId ?? passage?.id);
            if (passageId) ids.add(passageId);
          }
        }
      }
      passagesBySource.set(id, ids);
    }

    for (const [id, entries] of sourcesById) {
      if (entries.length > 1) {
        const signatures = new Set(entries.map(source => JSON.stringify({
          url: normalizeUrl(source.url || source.finalUrl || ''),
          role: text(source.sourceRole || source.role),
          title: text(source.title)
        })));
        add(finding(signatures.size > 1 ? 'EA-PACK-SOURCE-CONFLICT' : 'EA-PACK-SOURCE-DUPLICATE',
          signatures.size > 1 ? 'high' : 'medium',
          signatures.size > 1 ? `Source ID ${id} has conflicting metadata.` : `Source ID ${id} appears more than once.`,
          null, { sourceId: id, occurrences: entries.length }), signatures.size > 1);
      }
    }

    for (const claim of claimReport.claims) {
      const index = Number.isFinite(Number(claim?.index)) ? Number(claim.index) : null;
      const sourceId = text(claim?.sourceId);
      if (!sourceId) {
        add(finding('EA-CLAIM-SOURCE-ID-MISSING', 'high', 'Claim has no sourceId.', index));
        continue;
      }
      const sourceMatches = sourcesById.get(sourceId) || [];
      if (sourceMatches.length === 0) {
        add(finding('EA-CLAIM-SOURCE-UNKNOWN', 'high', `Claim sourceId ${sourceId} is absent from the evidence pack.`, index, { sourceId }));
        continue;
      }
      const source = sourceMatches[0];
      const claimUrl = text(claim?.bestUrl ?? claim?.sourceUrl);
      const packUrl = text(source.url || source.finalUrl);
      if (claimUrl && packUrl && normalizeUrl(claimUrl) !== normalizeUrl(packUrl)) {
        add(finding('EA-CLAIM-URL-MISMATCH', 'high', 'Claim source URL differs from the evidence-pack source URL.', index, { sourceId, claimUrl, packUrl }));
      } else if (!claimUrl) {
        add(finding('EA-CLAIM-URL-MISSING', 'medium', 'Claim has a source ID but no saved source URL.', index, { sourceId }));
      }
      const claimRole = text(claim?.sourceRole ?? claim?.coreFactMatch?.sourceRole);
      const packRole = text(source.sourceRole ?? source.role);
      if (claimRole && packRole && claimRole !== packRole) {
        add(finding('EA-CLAIM-ROLE-MISMATCH', 'high', 'Claim source role differs from the evidence-pack source role.', index, { sourceId, claimRole, packRole }));
      } else if (!claimRole) {
        add(finding('EA-CLAIM-ROLE-MISSING', 'low', 'Claim does not record a source role.', index, { sourceId }));
      }

      const passageIds = passagesBySource.get(sourceId) || new Set();
      const matched = Array.isArray(claim?.matchedPassages) ? claim.matchedPassages : [];
      if (matched.length === 0) {
        add(finding('EA-CLAIM-PASSAGES-MISSING', 'high', 'Claim has no matchedPassages identifiers.', index, { sourceId }));
      }
      for (const passageValue of matched) {
        const passageId = text(passageValue);
        const prefixMatch = passageId.match(/^(S\d+)-P(\d+)$/);
        const passageSourceId = passageId.match(/^(S\d+)-/ )?.[1] || null;
        if (passageSourceId && passageSourceId !== sourceId) {
          add(finding('EA-PASSAGE-SOURCE-MISMATCH', 'high', `Passage ${passageId} belongs to a different source ID.`, index, { sourceId, passageId, passageSourceId }));
        } else if (prefixMatch && !passageIds.has(passageId)) {
          add(finding('EA-PASSAGE-ID-UNKNOWN', 'high', `Passage ${passageId} is not present in the evidence pack.`, index, { sourceId, passageId }));
        } else if (!prefixMatch) {
          add(finding('EA-PASSAGE-ID-UNMAPPED', 'medium', `Passage identifier ${passageId} is not in the canonical Sx-Pn format; it cannot be validated by this auditor.`, index, { sourceId, passageId }));
        }
      }
      const bestPassageId = text(claim?.bestPassageId);
      if (bestPassageId) {
        for (const passageId of bestPassageId.split(',').map(text).filter(Boolean)) {
          if (/^S\d+-P\d+$/.test(passageId) && !passageIds.has(passageId)) {
            add(finding('EA-BEST-PASSAGE-ID-UNKNOWN', 'high', `bestPassageId ${passageId} is not present in the evidence pack.`, index, { sourceId, passageId }));
          } else if (!/^S\d+-P\d+$/.test(passageId)) {
            add(finding('EA-BEST-PASSAGE-ID-UNMAPPED', 'medium', `bestPassageId ${passageId} is not a canonical passage ID and remains unverified.`, index, { sourceId, passageId }));
          }
        }
      }
    }
  }

  const hasIntegrityFailure = integrity.length > 0;
  const hasHigh = findings.some(item => item.severity === 'high');
  const status = hasIntegrityFailure ? 'unknown' : hasHigh ? 'blocked' : findings.length ? 'attention' : 'clear';
  return {
    schemaVersion: '1.0',
    auditor: 'BOAT Evidence Auditor',
    mode: 'offline-read-only',
    generatedAt,
    status,
    summary: { claimCount: Array.isArray(claimReport?.claims) ? claimReport.claims.length : null, findingCount: findings.length, integrityFindingCount: integrity.length },
    artifacts: {
      claimReportPath, evidencePackPath, metadataPath,
      claimReportSha256: typeof claimReportRaw === 'string' ? sha256(claimReportRaw) : null,
      evidencePackSha256: typeof evidencePackRaw === 'string' ? sha256(evidencePackRaw) : null,
      workflowRun: text(metadata?.workflowRun) || null
    },
    findings,
    limitations: [
      'This auditor checks artifact identity and identifier lineage only; it does not fetch sources or prove factual truth.',
      'Matching source and passage IDs do not prove that a passage semantically supports its claim.',
      'Canonical Sx-Pn IDs are derived from the evidence pack source.passages array order; non-canonical IDs are reported as unmapped, not guessed.'
    ]
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`);
    args[key] = argv[++i];
  }
  return args;
}
function readJson(file, label) {
  const raw = fs.readFileSync(file, 'utf8');
  try { return { raw, value: JSON.parse(raw) }; }
  catch { throw new Error(`Invalid JSON in ${label}: ${file}`); }
}
export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  for (const key of ['report', 'pack', 'metadata']) if (!args[key]) throw new Error(`Required argument --${key}`);
  const reportFile = path.resolve(args.report), packFile = path.resolve(args.pack), metadataFile = path.resolve(args.metadata);
  const report = readJson(reportFile, 'claim report');
  const pack = readJson(packFile, 'evidence pack');
  const metadata = readJson(metadataFile, 'run metadata');
  const output = auditEvidenceLineage({
    claimReport: report.value, evidencePack: pack.value, metadata: metadata.value,
    claimReportRaw: report.raw, evidencePackRaw: pack.raw,
    claimReportPath: args.report, evidencePackPath: args.pack, metadataPath: args.metadata
  });
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  return output.status === 'unknown' ? 2 : output.status === 'blocked' ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = runCli(); }
  catch (error) { process.stderr.write(`BOAT Evidence Auditor error: ${error.message}\n`); process.exitCode = 2; }
}

#!/usr/bin/env node
/**
 * Read-only audit of the root claim report against the canonical evidence-pack file.
 * Missing/empty/invalid packs remain UNKNOWN; saved claim status is never upgraded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const parse = raw => { try { return { value: JSON.parse(raw), valid: true }; } catch { return { value: null, valid: false }; } };

export function auditRootClaimLineage({ reportRaw, packRaw }) {
  const reportParsed = typeof reportRaw === 'string' ? parse(reportRaw) : { value: null, valid: false };
  const packPresent = typeof packRaw === 'string';
  const packParsed = packPresent && packRaw.length > 0 ? parse(packRaw) : { value: null, valid: false };
  const report = reportParsed.value;
  const pack = packParsed.value;
  const claims = Array.isArray(report?.claims) ? report.claims : [];
  const usablePack = packParsed.valid && pack && Array.isArray(pack.sources);
  const sourceIndex = new Map();
  if (usablePack) for (const source of pack.sources) {
    const id = text(source?.id ?? source?.sourceId);
    if (!id) continue;
    if (!sourceIndex.has(id)) sourceIndex.set(id, []);
    sourceIndex.get(id).push(source);
  }
  const rows = claims.map((claim, i) => {
    const sourceId = text(claim?.sourceId ?? claim?.coreFactMatch?.sourceId);
    const ids = [
      ...(Array.isArray(claim?.matchedPassages) ? claim.matchedPassages : []),
      ...text(claim?.bestPassageId).split(',')
    ].map(text).filter((v, j, all) => all.indexOf(v) === j);
    const matches = usablePack ? (sourceIndex.get(sourceId) ?? []) : [];
    let sourceStatus = !sourceId ? 'unknown-source-id-missing' : !usablePack ? 'unknown-pack-binding' : matches.length === 0 ? 'unknown-source-not-found' : matches.length > 1 ? 'unknown-source-id-duplicate' : 'source-id-resolved-fields-only';
    const passageStatuses = ids.map(id => ({
      id,
      status: !usablePack ? 'unknown-pack-binding'
        : !sourceId || !matches.length ? 'unknown-source-not-resolved'
        : matches.length > 1 ? 'unknown-duplicate-source-id'
        : Array.isArray(matches[0].passages) && /^S\d+-P\d+$/.test(id) && id.startsWith(sourceId + '-P')
          ? (Number(id.slice(id.lastIndexOf('-P') + 2)) <= matches[0].passages.length ? 'passage-id-resolved-fields-only' : 'unknown-passage-not-found')
          : (Array.isArray(pack?.evidenceBrief?.relevantPassages) && pack.evidenceBrief.relevantPassages.some(p => text(p?.sourceId) === sourceId && text(p?.passageId ?? p?.id) === id) ? 'passage-id-resolved-fields-only' : 'unknown-passage-not-found')
    }));
    return {
      claimIndex: Number.isInteger(claim?.index) ? claim.index : i + 1,
      claimText: text(claim?.claim) || null,
      savedVerifierStatus: text(claim?.status) || 'unknown',
      savedClassification: text(claim?.classification) || null,
      sourceId: sourceId || null,
      sourceResolution: sourceStatus,
      passageIds: ids,
      passageResolution: passageStatuses,
      factualSupport: 'not_assessed',
      note: 'Identifier resolution is structural only; it does not establish passage-to-claim semantic support.'
    };
  });
  const status = !reportParsed.valid || !Array.isArray(report?.claims) ? 'unknown-report-invalid-or-missing'
    : !usablePack ? 'unknown-pack-binding'
    : rows.some(r => r.sourceResolution.startsWith('unknown-') || r.passageResolution.some(p => p.status.startsWith('unknown-'))) ? 'attention-unresolved-identifiers'
    : 'identifiers-resolved-semantic-support-unknown';
  return {
    schemaVersion: 1, reportType: 'boat-root-claim-evidence-lineage', readOnly: true,
    automaticRepair: false, automaticPublicationDecision: false, status,
    artifacts: {
      reportPresent: reportParsed.valid, reportSha256: typeof reportRaw === 'string' ? sha256(reportRaw) : null,
      evidencePackPresent: packPresent, evidencePackValidJson: packParsed.valid,
      evidencePackSha256: typeof packRaw === 'string' ? sha256(packRaw) : null,
      evidencePackSourceCount: usablePack ? pack.sources.length : null,
      articlePath: text(report?.articlePath) || null,
      savedReportPass: typeof report?.pass === 'boolean' ? report.pass : null,
      savedClaimCount: Number.isFinite(Number(report?.claimCount)) ? Number(report.claimCount) : claims.length
    },
    summary: {
      claims: rows.length,
      sourceResolved: rows.filter(r => r.sourceResolution === 'source-id-resolved-fields-only').length,
      sourceUnresolved: rows.filter(r => r.sourceResolution.startsWith('unknown-')).length,
      passagesResolved: rows.reduce((n, r) => n + r.passageResolution.filter(p => p.status === 'passage-id-resolved-fields-only').length, 0),
      passagesUnresolved: rows.reduce((n, r) => n + r.passageResolution.filter(p => p.status.startsWith('unknown-')).length, 0)
    },
    claims: rows,
    limitations: [
      'Exact report-to-pack pairing requires run metadata with matching artifact hashes; this root-snapshot audit does not infer pairing from similar filenames.',
      'Matching source and passage identifiers proves structural resolution only, not that the passage supports the claim.',
      'No source URLs are fetched, no model/provider is called, and no article or publication state is changed.'
    ]
  };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const reportPath = path.join(root, 'data', 'claim-verification.json');
  const packPath = path.join(root, 'data', 'authoritative-evidence-pack.json');
  const reportRaw = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : null;
  const packRaw = fs.existsSync(packPath) ? fs.readFileSync(packPath, 'utf8') : null;
  process.stdout.write(JSON.stringify(auditRootClaimLineage({ reportRaw, packRaw }), null, 2) + '\\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

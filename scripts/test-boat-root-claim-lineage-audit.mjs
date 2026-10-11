import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { auditRootClaimLineage } from './boat-root-claim-lineage-audit.mjs';

const report = { articlePath: 'content/articles/example.md', pass: true, claimCount: 1, claims: [
  { index: 1, claim: 'Example claim', status: 'partial', classification: 'supported_with_context', sourceId: 'S1', bestPassageId: 'S1-P1', matchedPassages: ['S1-P1'] }
] };
const reportRaw = JSON.stringify(report);
const missing = auditRootClaimLineage({ reportRaw, packRaw: '' });
assert.equal(missing.status, 'unknown-pack-binding');
assert.equal(missing.artifacts.savedReportPass, true);
assert.equal(missing.summary.claims, 1);
assert.equal(missing.claims[0].sourceResolution, 'unknown-pack-binding');
assert.equal(missing.claims[0].passageResolution[0].status, 'unknown-pack-binding');
assert.equal(missing.claims[0].factualSupport, 'not_assessed');

const invalid = auditRootClaimLineage({ reportRaw, packRaw: '{not json' });
assert.equal(invalid.status, 'unknown-pack-binding');
assert.equal(invalid.artifacts.evidencePackValidJson, false);

const pack = { sources: [{ id: 'S1', url: 'https://example.com', role: 'DIRECT_REPORTING', passages: ['Example passage'] }] };
const resolved = auditRootClaimLineage({ reportRaw, packRaw: JSON.stringify(pack) });
assert.equal(resolved.status, 'unknown-pack-binding');
assert.equal(resolved.claims[0].sourceResolution, 'unknown-pack-binding');
assert.equal(resolved.claims[0].localPackSourceIdMatch, true);
assert.equal(resolved.claims[0].localPackPassageIdMatches.includes('S1-P1'), true);
assert.equal(resolved.claims[0].passageResolution[0].status, 'unknown-pack-binding');
assert.equal(resolved.claims[0].factualSupport, 'not_assessed');

const wrong = { sources: [{ id: 'S2', passages: ['Different source'] }] };
const unresolved = auditRootClaimLineage({ reportRaw, packRaw: JSON.stringify(wrong) });
assert.equal(unresolved.status, 'unknown-pack-binding');
assert.equal(unresolved.claims[0].sourceResolution, 'unknown-pack-binding');
assert.equal(unresolved.claims[0].localPackSourceIdMatch, false);
assert.equal(unresolved.claims[0].passageResolution[0].status, 'unknown-pack-binding');

const live = spawnSync(process.execPath, ['scripts/boat-root-claim-lineage-audit.mjs'], { encoding: 'utf8' });
assert.equal(live.status, 0, live.stderr);
const output = JSON.parse(live.stdout);
assert.equal(output.reportType, 'boat-root-claim-evidence-lineage');
assert.equal(output.status, 'unknown-pack-binding');
assert.equal(output.artifacts.reportPresent, true);
assert.equal(output.summary.claims, 10);
console.log('BOAT root claim/evidence lineage audit: PASS (unbound root snapshot correctly remains UNKNOWN)');

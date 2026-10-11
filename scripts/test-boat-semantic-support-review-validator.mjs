import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts/boat-semantic-support-review-validator.mjs');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/semantic-support-review.schema.json'), 'utf8'));

function validReview() {
  return {
    schemaVersion: '1.0', reviewId: 'SSR-TEST-001', reviewStatus: 'completed',
    reviewer: { reviewerId: 'reviewer-test', role: 'fact_checker', independenceDisclosure: 'No known conflict declared for this fixture.', reviewedAt: '2026-10-11T00:00:00.000Z' },
    subject: { workflowRun: '12345', workflowSha: 'abcdef1234567', articleSha256: 'a'.repeat(64), claimReportSha256: 'b'.repeat(64), evidencePackSha256: 'c'.repeat(64), proposalId: 'proposal-test-1' },
    claim: { claimIndex: 1, exactClaimText: 'The company announced the product on Monday.', proposedReplacement: 'The company announced the product on Monday.', sourceId: 'S1', passageId: 'S1-P1', sourceUrl: 'https://example.com/source', passageText: 'The company announced the product on Monday.' },
    assessment: { verdict: 'supported', factualComponents: [{ component: 'Announcement occurred Monday', support: 'direct', passageQuote: 'announced the product on Monday', explanation: 'The quoted wording directly states the event and date.' }], scopeAlignment: 'exact', temporalAlignment: 'aligned', attributionAlignment: 'aligned', uncertaintyPreserved: true, rationale: 'The cited passage directly supports the event and date; no additional factual detail is introduced.' },
    decision: { recommendation: 'accept_for_existing_gates', riskFlags: [], requiredFollowUp: 'Run the existing claim and editorial gates; this record does not approve publication.' },
    safety: { semanticSupport: 'not_verified', approvalRequired: true, automaticApplication: false, existingGatesStillRequired: true }
  };
}
function runCli(dir, record, name = 'review.json') {
  const input = path.join(dir, name);
  fs.writeFileSync(input, typeof record === 'string' ? record : JSON.stringify(record, null, 2));
  const result = spawnSync(process.execPath, [cli, input], { encoding: 'utf8' });
  return { ...result, output: JSON.parse(result.stdout) };
}

test('CLI accepts a valid review record and reports its ID', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-valid-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const result = runCli(dir, validReview());
  assert.equal(result.status, 0, result.stdout + result.stderr); assert.equal(result.output.valid, true);
  assert.equal(result.output.reviewId, 'SSR-TEST-001'); assert.deepEqual(result.output.errors, []);
});
test('CLI rejects malformed bundle hashes', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-hash-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); record.subject.evidencePackSha256 = 'not-a-hash';
  const result = runCli(dir, record); assert.equal(result.status, 1); assert.equal(result.output.valid, false);
  assert.ok(result.output.errors.some(error => error.includes('evidencePackSha256')));
});
test('CLI rejects missing reviewer identity and malformed timestamp', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-reviewer-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); delete record.reviewer.reviewerId; record.reviewer.reviewedAt = 'yesterday';
  const result = runCli(dir, record); assert.equal(result.status, 1);
  assert.ok(result.output.errors.some(error => error.includes('reviewerId'))); assert.ok(result.output.errors.some(error => error.includes('date-time')));
});
test('CLI rejects impossible calendar dates and out-of-range clock fields', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-datetime-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); record.reviewer.reviewedAt = '2026-02-31T25:70:80Z';
  const result = runCli(dir, record); assert.equal(result.status, 1);
  assert.ok(result.output.errors.some(error => error.includes('date-time')));
});
test('CLI enforces schema enums and numeric minima', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-enum-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); record.reviewer.role = 'robot'; record.claim.claimIndex = 0;
  const result = runCli(dir, record); assert.equal(result.status, 1);
  assert.ok(result.output.errors.some(error => error.includes('reviewer.role')));
  assert.ok(result.output.errors.some(error => error.includes('claimIndex')));
});
test('CLI rejects invalid passage IDs, empty passage evidence, and invalid URI', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-passage-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); record.claim.passageId = 'S1-FF1'; record.claim.passageText = ''; record.claim.sourceUrl = 'not a url';
  const result = runCli(dir, record); assert.equal(result.status, 1);
  assert.ok(result.output.errors.some(error => error.includes('passageId'))); assert.ok(result.output.errors.some(error => error.includes('passageText')));
  assert.ok(result.output.errors.some(error => error.includes('uri')));
});
test('CLI independently rejects unsafe safety invariants', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-safety-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); record.safety.automaticApplication = true; record.safety.semanticSupport = 'supported';
  const result = runCli(dir, record); assert.equal(result.status, 1);
  assert.ok(result.output.errors.some(error => error.includes('automaticApplication'))); assert.ok(result.output.errors.some(error => error.includes('semanticSupport')));
});
test('CLI rejects extra properties and missing component-level assessment', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-contract-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const record = validReview(); record.unreviewed = true; delete record.assessment.factualComponents;
  const result = runCli(dir, record); assert.equal(result.status, 1);
  assert.ok(result.output.errors.some(error => error.includes('additional property'))); assert.ok(result.output.errors.some(error => error.includes('factualComponents')));
});
test('CLI rejects malformed JSON and missing input without writing review files', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-review-cli-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const malformed = runCli(dir, '{not json'); assert.equal(malformed.status, 1); assert.equal(malformed.output.valid, false);
  const missing = spawnSync(process.execPath, [cli, path.join(dir, 'absent.json')], { encoding: 'utf8' });
  assert.equal(missing.status, 1); assert.equal(JSON.parse(missing.stdout).valid, false);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['review.json']);
});
test('validator implements the review schema keywords without network dependencies', () => {
  const serialized = fs.readFileSync(cli, 'utf8');
  for (const keyword of ['required', 'additionalProperties', 'pattern', 'format', 'minLength', 'minItems', 'minimum', 'const', 'enum']) assert.ok(serialized.includes(keyword), 'validator missing schema keyword ' + keyword);
  assert.equal(schema.properties.safety.properties.automaticApplication.const, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditReviewSet } from './boat-semantic-support-review-set.mjs';
import { review, reviewSetFixtures } from './fixtures/boat-semantic-support-review-set-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/semantic-support-review-set-report.schema.json'), 'utf8'));

test('report schema requires stable envelope and explicitly forbids additional properties', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(schema.required, ['valid', 'reviewSetStatus', 'recordCount', 'records', 'findings', 'subjectGroups']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.records.items.additionalProperties, false);
  assert.equal(schema.properties.findings.items.additionalProperties, false);
  assert.equal(schema.properties.subjectGroups.items.additionalProperties, false);
  assert.ok(schema.properties.reviewSetStatus.enum.includes('conflicting_reviews_require_human_resolution'));
});

test('report schema locks the no-winner safety boundary', () => {
  const group = schema.properties.subjectGroups.items;
  assert.equal(group.properties.aggregateVerdict.const, null);
  assert.equal(group.properties.automaticAdjudication.const, false);
  assert.ok(group.required.includes('recordIndices'));
  assert.ok(group.required.includes('allVerdicts'));
  assert.match(group.properties.subjectFingerprint.pattern, /64/);
});

test('auditor output conforms to the declared envelope and retains all records and dissent', () => {
  for (const fixture of Object.values(reviewSetFixtures)) {
    const report = auditReviewSet(fixture);
    assert.equal(typeof report.valid, 'boolean');
    assert.ok(schema.properties.reviewSetStatus.enum.includes(report.reviewSetStatus));
    assert.equal(report.recordCount, fixture.length);
    assert.equal(report.records.length, fixture.length);
    assert.ok(Array.isArray(report.findings));
    assert.ok(Array.isArray(report.subjectGroups));
    for (const record of report.records) {
      assert.equal(typeof record.index, 'number');
      assert.equal(typeof record.eligible, 'boolean');
      assert.ok(Array.isArray(record.errors));
      assert.ok(fixture[record.index] !== undefined);
    }
    for (const finding of report.findings) {
      assert.ok(schema.properties.findings.items.properties.type.enum.includes(finding.type));
      assert.equal(typeof finding.message, 'string');
      if (finding.subjectFingerprint !== undefined) assert.match(finding.subjectFingerprint, /^[a-f0-9]{64}$/);
    }
    for (const group of report.subjectGroups) {
      assert.match(group.subjectFingerprint, /^[a-f0-9]{64}$/);
      assert.equal(group.aggregateVerdict, null);
      assert.equal(group.automaticAdjudication, false);
      for (const index of group.recordIndices) assert.ok(fixture[index] !== undefined);
    }
  }
});

test('invalid input report remains valid under the documented envelope', () => {
  const report = auditReviewSet(null);
  assert.equal(report.reviewSetStatus, 'invalid_input');
  assert.equal(report.recordCount, 0);
  assert.equal(report.records.length, 0);
  assert.equal(report.findings[0].type, 'invalid_input');
});

test('CLI input-error envelope uses a documented finding type', () => {
  const known = schema.properties.findings.items.properties.type.enum;
  assert.ok(known.includes('input_error'));
  assert.ok(known.includes('invalid_input'));
});

test('distinct-subject report order is stable and indices still resolve to source records', () => {
  const a = review({ id: 'SSR-SCHEMA-401', reviewer: 'reviewer-a' });
  const b = review({ id: 'SSR-SCHEMA-402', reviewer: 'reviewer-b', verdict: 'unsupported' });
  b.subject.proposalId = 'proposal-schema-2';
  for (const input of [[a, b], [b, a]]) {
    const report = auditReviewSet(input);
    assert.deepEqual(report.subjectGroups.map(group => group.subjectFingerprint), [...report.subjectGroups.map(group => group.subjectFingerprint)].sort());
    for (const group of report.subjectGroups) {
      assert.equal(report.records[group.recordIndices[0]].reviewId, input[group.recordIndices[0]].reviewId);
    }
  }
});

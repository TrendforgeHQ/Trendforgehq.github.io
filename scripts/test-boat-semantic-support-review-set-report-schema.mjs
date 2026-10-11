import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditReviewSet } from './boat-semantic-support-review-set.mjs';
import { review, reviewSetFixtures } from './fixtures/boat-semantic-support-review-set-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/semantic-support-review-set-report.schema.json'), 'utf8'));

function schemaErrors(value, rule, pointer = '

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
, errors = []) {
  if (Object.hasOwn(rule, 'const') && value !== rule.const) errors.push(`${pointer}: const mismatch`);
  if (rule.enum && !rule.enum.some(item => item === value)) errors.push(`${pointer}: enum mismatch`);
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    const matches = types.some(type => {
      if (type === 'null') return value === null;
      if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
      if (type === 'array') return Array.isArray(value);
      if (type === 'integer') return Number.isInteger(value);
      if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
      return typeof value === type;
    });
    if (!matches) { errors.push(`${pointer}: expected ${types.join('|')}`); return errors; }
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) errors.push(`${pointer}: minLength`);
    if (rule.pattern && !(new RegExp(rule.pattern).test(value))) errors.push(`${pointer}: pattern`);
  }
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) errors.push(`${pointer}: minimum`);
  if (Array.isArray(value)) {
    if (rule.items) value.forEach((item, index) => schemaErrors(item, rule.items, `${pointer}[${index}]`, errors));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${pointer}.${key}: required`);
    for (const [key, child] of Object.entries(value)) {
      if (rule.properties && Object.hasOwn(rule.properties, key)) schemaErrors(child, rule.properties[key], `${pointer}.${key}`, errors);
      else if (rule.additionalProperties === false) errors.push(`${pointer}.${key}: additional property`);
    }
  }
  return errors;
}


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

test('actual report output validates against every implemented report-schema keyword', () => {
  for (const fixture of Object.values(reviewSetFixtures)) {
    const report = auditReviewSet(fixture);
    assert.deepEqual(schemaErrors(report, schema), []);
  }
  assert.deepEqual(schemaErrors(auditReviewSet(null), schema), []);
});

test('structural validator rejects malformed report fields and extra properties', () => {
  const report = auditReviewSet(reviewSetFixtures.independentDisagreement);
  const malformed = structuredClone(report);
  malformed.subjectGroups[0].subjectFingerprint = 'not-a-sha256';
  malformed.subjectGroups[0].aggregateVerdict = 'supported';
  malformed.subjectGroups[0].automaticAdjudication = true;
  malformed.subjectGroups[0].unexpected = 'must fail';
  const errors = schemaErrors(malformed, schema);
  assert.ok(errors.some(error => error.includes('subjectFingerprint: pattern')));
  assert.ok(errors.some(error => error.includes('aggregateVerdict: const mismatch')));
  assert.ok(errors.some(error => error.includes('automaticAdjudication: const mismatch')));
  assert.ok(errors.some(error => error.includes('subjectGroups[0].unexpected: additional property')));
});

test('structural validator rejects missing required fields and unknown finding types', () => {
  const report = auditReviewSet(reviewSetFixtures.independentDisagreement);
  const malformed = structuredClone(report);
  delete malformed.findings[0].message;
  malformed.findings[0].type = 'automatic_approval';
  const errors = schemaErrors(malformed, schema);
  assert.ok(errors.some(error => error.includes('findings[0].message: required')));
  assert.ok(errors.some(error => error.includes('findings[0].type: enum mismatch')));
});

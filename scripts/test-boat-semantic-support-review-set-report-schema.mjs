import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditReviewSet } from './boat-semantic-support-review-set.mjs';
import { review, reviewSetFixtures } from './fixtures/boat-semantic-support-review-set-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'BOAT/schemas/semantic-support-review-set-report.schema.json'), 'utf8'));

function schemaErrors(value, rule, pointer = '$', errors = []) {
  if (Object.hasOwn(rule, 'const') && value !== rule.const) errors.push(pointer + ': const mismatch');
  if (rule.enum && !rule.enum.some(item => item === value)) errors.push(pointer + ': enum mismatch');
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
    if (!matches) { errors.push(pointer + ': expected ' + types.join('|')); return errors; }
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) errors.push(pointer + ': minLength');
    if (rule.pattern && !(new RegExp(rule.pattern).test(value))) errors.push(pointer + ': pattern');
  }
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) errors.push(pointer + ': minimum');
  if (Array.isArray(value) && rule.items) value.forEach((item, index) => schemaErrors(item, rule.items, pointer + '[' + index + ']', errors));
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required || []) if (!Object.hasOwn(value, key)) errors.push(pointer + '.' + key + ': required');
    for (const [key, child] of Object.entries(value)) {
      if (rule.properties && Object.hasOwn(rule.properties, key)) schemaErrors(child, rule.properties[key], pointer + '.' + key, errors);
      else if (rule.additionalProperties === false) errors.push(pointer + '.' + key + ': additional property');
    }
  }
  return errors;
}

test('report schema requires stable envelope and rejects unknown fields', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(schema.required, ['valid', 'reviewSetStatus', 'recordCount', 'records', 'findings', 'subjectGroups']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.records.items.additionalProperties, false);
  assert.equal(schema.properties.findings.items.additionalProperties, false);
  assert.equal(schema.properties.subjectGroups.items.additionalProperties, false);
});

test('schema fixes no-winner safety boundary', () => {
  const group = schema.properties.subjectGroups.items;
  assert.equal(group.properties.aggregateVerdict.const, null);
  assert.equal(group.properties.automaticAdjudication.const, false);
  assert.ok(group.required.includes('recordIndices'));
  assert.ok(group.required.includes('allVerdicts'));
});

test('actual audit output validates against the declared schema for all golden fixtures', () => {
  for (const fixture of Object.values(reviewSetFixtures)) assert.deepEqual(schemaErrors(auditReviewSet(fixture), schema), []);
  assert.deepEqual(schemaErrors(auditReviewSet(null), schema), []);
});

test('validator rejects malformed fields, unsafe winner values, and extra properties', () => {
  const report = auditReviewSet(reviewSetFixtures.independentDisagreement);
  const bad = structuredClone(report);
  bad.subjectGroups[0].subjectFingerprint = 'not-a-sha256';
  bad.subjectGroups[0].aggregateVerdict = 'supported';
  bad.subjectGroups[0].automaticAdjudication = true;
  bad.subjectGroups[0].unexpected = 'must fail';
  const errors = schemaErrors(bad, schema);
  assert.ok(errors.some(error => error.includes('subjectFingerprint: pattern')));
  assert.ok(errors.some(error => error.includes('aggregateVerdict: const mismatch')));
  assert.ok(errors.some(error => error.includes('automaticAdjudication: const mismatch')));
  assert.ok(errors.some(error => error.includes('subjectGroups[0].unexpected: additional property')));
});

test('validator rejects missing required fields and unknown finding types', () => {
  const bad = structuredClone(auditReviewSet(reviewSetFixtures.independentDisagreement));
  delete bad.findings[0].message;
  bad.findings[0].type = 'automatic_approval';
  const errors = schemaErrors(bad, schema);
  assert.ok(errors.some(error => error.includes('findings[0].message: required')));
  assert.ok(errors.some(error => error.includes('findings[0].type: enum mismatch')));
});

test('invalid input report conforms to schema envelope', () => {
  const report = auditReviewSet(null);
  assert.equal(report.reviewSetStatus, 'invalid_input');
  assert.equal(report.recordCount, 0);
  assert.deepEqual(schemaErrors(report, schema), []);
});

test('CLI input-error finding types are declared in the report schema', () => {
  const known = schema.properties.findings.items.properties.type.enum;
  assert.ok(known.includes('input_error'));
  assert.ok(known.includes('invalid_input'));
});

test('report subject ordering is stable and indices resolve to source records', () => {
  const a = review({ id: 'SSR-SCHEMA-401', reviewer: 'reviewer-a' });
  const b = review({ id: 'SSR-SCHEMA-402', reviewer: 'reviewer-b', verdict: 'unsupported' });
  b.subject.proposalId = 'proposal-schema-2';
  for (const input of [[a, b], [b, a]]) {
    const report = auditReviewSet(input);
    assert.deepEqual(report.subjectGroups.map(group => group.subjectFingerprint), report.subjectGroups.map(group => group.subjectFingerprint).slice().sort());
    for (const group of report.subjectGroups) assert.equal(report.records[group.recordIndices[0]].reviewId, input[group.recordIndices[0]].reviewId);
    assert.deepEqual(schemaErrors(report, schema), []);
  }
});

test('malformed source identity types are reported without corrupting report envelope', () => {
  const bad = structuredClone(reviewSetFixtures.invalidRecord[0]);
  bad.reviewId = 42;
  bad.reviewer.reviewerId = { unexpected: true };
  bad.assessment.verdict = 'automatic_approval';
  const report = auditReviewSet([bad]);
  assert.equal(report.valid, false);
  assert.equal(report.records[0].reviewId, null);
  assert.equal(report.records[0].reviewerId, null);
  assert.equal(report.records[0].verdict, null);
  assert.ok(report.records[0].errors.length > 0);
  assert.deepEqual(schemaErrors(report, schema), []);
});

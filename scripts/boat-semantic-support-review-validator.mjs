#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'BOAT/schemas/semantic-support-review.schema.json');

function checkType(value, type) {
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return true;
}

function formatValid(value, format) {
  if (format === 'uri') {
    try { const parsed = new URL(value); return Boolean(parsed.protocol && parsed.hostname); }
    catch { return false; }
  }
  if (format === 'date-time') {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      && Number.isFinite(Date.parse(value));
  }
  return true;
}

// Dependency-free implementation of the keywords used by the checked-in schema.
function validate(value, rule, pointer = '$', errors = []) {
  if (rule.const !== undefined && value !== rule.const) errors.push(`${pointer}: must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.some(item => item === value)) errors.push(`${pointer}: must be one of ${rule.enum.map(JSON.stringify).join(', ')}`);
  if (rule.type && !checkType(value, rule.type)) {
    errors.push(`${pointer}: expected ${rule.type}`);
    return errors;
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) errors.push(`${pointer}: must contain at least ${rule.minLength} character(s)`);
    if (rule.pattern && !(new RegExp(rule.pattern).test(value))) errors.push(`${pointer}: does not match required pattern`);
    if (rule.format && !formatValid(value, rule.format)) errors.push(`${pointer}: invalid ${rule.format} format`);
  }
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) errors.push(`${pointer}: must be >= ${rule.minimum}`);
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${pointer}: must contain at least ${rule.minItems} item(s)`);
    if (rule.items) value.forEach((item, index) => validate(item, rule.items, `${pointer}[${index}]`, errors));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required ?? []) if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${pointer}.${key}: required property is missing`);
    for (const [key, child] of Object.entries(value)) {
      if (rule.properties?.[key]) validate(child, rule.properties[key], `${pointer}.${key}`, errors);
      else if (rule.additionalProperties === false) errors.push(`${pointer}.${key}: additional property is not allowed`);
    }
  }
  return errors;
}

export function validateSemanticSupportReview(review, schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))) {
  const errors = validate(review, schema);
  const safety = review && typeof review === 'object' ? review.safety : undefined;
  const invariants = { semanticSupport: 'not_verified', approvalRequired: true, automaticApplication: false, existingGatesStillRequired: true };
  for (const [key, expected] of Object.entries(invariants)) {
    if (!safety || safety[key] !== expected) errors.push(`$.safety.${key}: safety invariant must equal ${JSON.stringify(expected)}`);
  }
  return [...new Set(errors)];
}

export function validateReviewFile(filePath) {
  const review = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { reviewId: review?.reviewId ?? null, errors: validateSemanticSupportReview(review) };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    console.error('Usage: node scripts/boat-semantic-support-review-validator.mjs <review-record.json>');
    process.exitCode = args[0] === '--help' || args[0] === '-h' ? 0 : 2;
    return;
  }
  try {
    const result = validateReviewFile(args[0]);
    const output = { schema: 'BOAT semantic-support review v1.0', valid: result.errors.length === 0, reviewId: result.reviewId, errors: result.errors };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    if (!output.valid) process.exitCode = 1;
  } catch (error) {
    const output = { schema: 'BOAT semantic-support review v1.0', valid: false, reviewId: null, errors: [error instanceof SyntaxError ? 'Input is not valid JSON.' : `Cannot read/validate input: ${error.message}`] };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();

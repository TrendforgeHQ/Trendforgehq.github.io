#!/usr/bin/env node
/**
 * Validates the portable BOAT task checkpoint artifact before cross-run resume.
 * Uses exact file hashes and task provenance; no network or AI calls.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateTaskRecord } from './boat-task-state.mjs';

export const CHECKPOINT_MANIFEST_VERSION = '1.0';
export const BOAT_AUDIT_PROFILE = 'combined-structural-evidence-lineage-claim-history';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(stableValue) : stableValue(value));
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  return value;
}
const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isTaskId = value => typeof value === 'string' && /^boat_[a-f0-9]{24}$/.test(value);
const isRunId = value => (typeof value === 'string' || typeof value === 'number') && /^[0-9]+$/.test(String(value));

function parseRecord(taskRecordText) {
  let record;
  try { record = JSON.parse(taskRecordText); }
  catch { throw new Error('Checkpoint task record is not valid JSON'); }
  const validation = validateTaskRecord(record);
  if (!validation.valid) throw new Error('Checkpoint task record is invalid: ' + validation.errors.join('; '));
  if (record.taskType !== 'published_catalogue_audit') throw new Error('Checkpoint task type is not supported for resume');
  if (record.config?.auditVersion !== 3 || record.config?.auditProfile !== BOAT_AUDIT_PROFILE) {
    throw new Error('Checkpoint audit profile/version is not supported for resume');
  }
  if (!['queued', 'running', 'paused', 'completed'].includes(record.status)) {
    throw new Error('Checkpoint task status is not resumable: ' + record.status);
  }
  return record;
}

export function createCheckpointManifest({ taskRecordText, reportText = null, sourceRunId, expectedTaskId }) {
  if (!isRunId(sourceRunId)) throw new Error('sourceRunId must be a numeric GitHub Actions run ID');
  if (!isTaskId(expectedTaskId)) throw new Error('expectedTaskId must be a valid BOAT task ID');
  const record = parseRecord(taskRecordText);
  if (record.taskId !== expectedTaskId) throw new Error('Checkpoint task ID does not match requested artifact task ID');
  return {
    schemaVersion: CHECKPOINT_MANIFEST_VERSION,
    sourceRunId: String(sourceRunId),
    taskId: record.taskId,
    taskType: record.taskType,
    pinnedCommitSha: record.pinnedCommitSha,
    auditVersion: record.config.auditVersion,
    auditProfile: record.config.auditProfile,
    configSha256: sha256(stable(record.config)),
    taskRecordSha256: sha256(taskRecordText),
    reportSha256: reportText === null ? null : sha256(reportText)
  };
}

export function validateCheckpointManifest({ manifestText, taskRecordText, reportText = null, expectedTaskId, expectedSourceRunId, expectedCommitSha }) {
  let manifest;
  try { manifest = JSON.parse(manifestText); }
  catch { throw new Error('Checkpoint manifest is not valid JSON'); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Checkpoint manifest must be an object');
  if (manifest.schemaVersion !== CHECKPOINT_MANIFEST_VERSION) throw new Error('Unsupported checkpoint manifest schemaVersion');
  if (!isRunId(expectedSourceRunId) || !isRunId(manifest.sourceRunId) || String(manifest.sourceRunId) !== String(expectedSourceRunId)) {
    throw new Error('Checkpoint source run ID does not match requested prior run');
  }
  if (!isTaskId(expectedTaskId) || manifest.taskId !== expectedTaskId) throw new Error('Checkpoint manifest task ID mismatch');
  if (!isSha(expectedCommitSha) || manifest.pinnedCommitSha !== expectedCommitSha) throw new Error('Checkpoint pinned commit does not match requested audit commit');
  if (manifest.taskType !== 'published_catalogue_audit' || manifest.auditVersion !== 3 || manifest.auditProfile !== BOAT_AUDIT_PROFILE) {
    throw new Error('Checkpoint manifest audit profile/version is not supported');
  }
  if (!isHash(manifest.taskRecordSha256) || sha256(taskRecordText) !== manifest.taskRecordSha256) {
    throw new Error('Checkpoint task-record hash mismatch');
  }
  const record = parseRecord(taskRecordText);
  if (record.taskId !== manifest.taskId || record.pinnedCommitSha !== manifest.pinnedCommitSha ||
      record.taskType !== manifest.taskType || record.config.auditVersion !== manifest.auditVersion ||
      record.config.auditProfile !== manifest.auditProfile || sha256(stable(record.config)) !== manifest.configSha256) {
    throw new Error('Checkpoint manifest provenance does not match task record');
  }
  if (manifest.reportSha256 === null) {
    if (reportText !== null) throw new Error('Unexpected report file for manifest without a report hash');
  } else if (!isHash(manifest.reportSha256) || reportText === null || sha256(reportText) !== manifest.reportSha256) {
    throw new Error('Checkpoint report hash mismatch or report missing');
  }
  return { valid: true, taskId: record.taskId, sourceRunId: String(manifest.sourceRunId), pinnedCommitSha: record.pinnedCommitSha, status: record.status };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error('Unexpected argument: ' + key);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + key);
    const name = ({ '--mode': 'mode', '--state-dir': 'stateDir', '--run-id': 'runId', '--task-id': 'taskId', '--commit': 'commit' })[key];
    if (!name) throw new Error('Unknown option: ' + key);
    if (Object.hasOwn(out, name)) throw new Error('Duplicate option: ' + key);
    out[name] = value;
  }
  if (!['create', 'validate'].includes(out.mode)) throw new Error('--mode must be create or validate');
  if (!out.stateDir || !isRunId(out.runId) || !isTaskId(out.taskId)) throw new Error('--state-dir, numeric --run-id, and valid --task-id are required');
  if (out.mode === 'validate' && !isSha(out.commit)) throw new Error('validate mode requires a full lowercase --commit SHA');
  return out;
}
async function readOptional(filePath) {
  try { return await fs.readFile(filePath, 'utf8'); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = path.resolve(args.stateDir);
  const taskPath = path.join(dir, args.taskId + '.json');
  const reportPath = path.join(dir, args.taskId + '.md');
  const manifestPath = path.join(dir, 'manifest.json');
  const taskRecordText = await fs.readFile(taskPath, 'utf8');
  const reportText = await readOptional(reportPath);
  if (args.mode === 'create') {
    const manifest = createCheckpointManifest({ taskRecordText, reportText, sourceRunId: args.runId, expectedTaskId: args.taskId });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    process.stdout.write(JSON.stringify({ valid: true, taskId: manifest.taskId, sourceRunId: manifest.sourceRunId, manifestPath }) + '\n');
    return;
  }
  const manifestText = await fs.readFile(manifestPath, 'utf8');
  const result = validateCheckpointManifest({ manifestText, taskRecordText, reportText, expectedTaskId: args.taskId, expectedSourceRunId: args.runId, expectedCommitSha: args.commit });
  process.stdout.write(JSON.stringify(result) + '\n');
}
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write('BOAT checkpoint manifest error: ' + error.message + '\n'); process.exitCode = 1; });
}

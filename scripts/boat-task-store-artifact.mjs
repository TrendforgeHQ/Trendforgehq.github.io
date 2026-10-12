#!/usr/bin/env node
/**
 * Portable, single-task export/import envelope for BOAT's canonical local store.
 * Integrity and identity checks are fail-closed; GitHub Actions run ID remains the
 * external provenance anchor. This is not a cryptographic signature or auth layer.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateTaskStore } from './boat-task-store.mjs';

export const PORTABLE_STORE_ARTIFACT_VERSION = 1;
export const PORTABLE_STORE_ARTIFACT_PROFILE = 'published-catalogue-audit-single-task';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const stable = value => JSON.stringify(canonical(value));
const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isTaskId = value => typeof value === 'string' && /^boat_[a-f0-9]{24}$/.test(value);
const isRunId = value => (typeof value === 'string' || typeof value === 'number') && /^[0-9]+$/.test(String(value));
const profileOk = task => task?.taskType === 'published_catalogue_audit' && task?.config?.auditVersion === 3 && task?.config?.auditProfile === 'combined-structural-evidence-lineage-claim-history';

function parseStore(storeText) {
  if (typeof storeText !== 'string') throw new Error('Exact canonical task-store bytes are required');
  let store;
  try { store = JSON.parse(storeText); } catch { throw new Error('Canonical task store is not valid JSON'); }
  const result = validateTaskStore(store);
  if (!result.valid) throw new Error('Canonical task store is invalid: ' + result.errors.join('; '));
  return store;
}
function identityHash(task) {
  return sha256(stable({ taskType: task.taskType, pinnedCommitSha: task.pinnedCommitSha, config: task.config }));
}
function expectedClaimKey(taskId) { return 'catalogue-audit:' + taskId; }

export function createPortableTaskStoreArtifact({ storeText, sourceRunId, expectedTaskId, expectedCommitSha } = {}) {
  if (!isRunId(sourceRunId)) throw new Error('sourceRunId must be a numeric GitHub Actions run ID');
  if (!isTaskId(expectedTaskId)) throw new Error('expectedTaskId must be a valid BOAT task ID');
  if (!isSha(expectedCommitSha)) throw new Error('expectedCommitSha must be a full lowercase commit SHA');
  const fullStore = parseStore(storeText);
  const task = fullStore.tasks.find(item => item.taskId === expectedTaskId);
  if (!task) throw new Error('Requested task is missing from canonical store');
  if (task.pinnedCommitSha !== expectedCommitSha) throw new Error('Task pinned commit does not match requested commit');
  if (!profileOk(task)) throw new Error('Task type or audit profile/version is unsupported for portable export');
  if (!['queued','running','paused','completed'].includes(task.status)) throw new Error('Task status is not eligible for portable checkpoint export');
  const expectedKey = expectedClaimKey(task.taskId);
  const claims = fullStore.idempotency.filter(item => item.taskId === task.taskId);
  const canonicalClaim = claims.find(item => item.key === expectedKey);
  if (!canonicalClaim || canonicalClaim.requestHash !== identityHash(task) || claims.length !== 1) {
    throw new Error('Task idempotency claim is missing, ambiguous, or inconsistent');
  }
  const portableStore = {
    schemaVersion: fullStore.schemaVersion,
    revision: fullStore.revision,
    tasks: [task],
    idempotency: [canonicalClaim]
  };
  const validation = validateTaskStore(portableStore);
  if (!validation.valid) throw new Error('Portable task-store subset is invalid: ' + validation.errors.join('; '));
  const portableStoreText = JSON.stringify(portableStore, null, 2) + '\n';
  const manifest = {
    schemaVersion: PORTABLE_STORE_ARTIFACT_VERSION,
    profile: PORTABLE_STORE_ARTIFACT_PROFILE,
    sourceRunId: String(sourceRunId),
    taskId: task.taskId,
    taskType: task.taskType,
    pinnedCommitSha: task.pinnedCommitSha,
    storeSchemaVersion: portableStore.schemaVersion,
    storeRevision: portableStore.revision,
    taskCount: portableStore.tasks.length,
    idempotencyClaimCount: portableStore.idempotency.length,
    taskRecordSha256: sha256(JSON.stringify(task, null, 2) + '\n'),
    storeSha256: sha256(portableStoreText)
  };
  return { portableStore, portableStoreText, manifest, manifestText: JSON.stringify(manifest, null, 2) + '\n' };
}

export function validatePortableTaskStoreArtifact({
  storeText, manifestText, expectedSourceRunId, expectedTaskId, expectedCommitSha
} = {}) {
  if (!isRunId(expectedSourceRunId)) throw new Error('expectedSourceRunId must be a numeric GitHub Actions run ID');
  if (!isTaskId(expectedTaskId)) throw new Error('expectedTaskId must be a valid BOAT task ID');
  if (!isSha(expectedCommitSha)) throw new Error('expectedCommitSha must be a full lowercase commit SHA');
  let manifest;
  try { manifest = JSON.parse(manifestText); } catch { throw new Error('Portable store manifest is not valid JSON'); }
  if (!object(manifest)) throw new Error('Portable store manifest must be an object');
  if (manifest.schemaVersion !== PORTABLE_STORE_ARTIFACT_VERSION || manifest.profile !== PORTABLE_STORE_ARTIFACT_PROFILE) throw new Error('Unsupported portable store artifact schema/profile');
  if (!isRunId(manifest.sourceRunId) || String(manifest.sourceRunId) !== String(expectedSourceRunId)) throw new Error('Portable store source run ID mismatch');
  if (manifest.taskId !== expectedTaskId) throw new Error('Portable store task ID mismatch');
  if (manifest.pinnedCommitSha !== expectedCommitSha || !isSha(manifest.pinnedCommitSha)) throw new Error('Portable store pinned commit mismatch');
  if (!isHash(manifest.storeSha256) || sha256(storeText) !== manifest.storeSha256) throw new Error('Portable task-store bytes hash mismatch');
  const store = parseStore(storeText);
  if (manifest.storeSchemaVersion !== store.schemaVersion || manifest.storeRevision !== store.revision || manifest.taskCount !== store.tasks.length || manifest.idempotencyClaimCount !== store.idempotency.length) throw new Error('Portable store manifest counts/schema do not match exact store bytes');
  if (store.tasks.length !== 1 || store.idempotency.length !== 1) throw new Error('Portable store must contain exactly one task and one idempotency claim');
  const task = store.tasks[0];
  if (task.taskId !== expectedTaskId || task.pinnedCommitSha !== expectedCommitSha || task.taskType !== manifest.taskType || !profileOk(task)) throw new Error('Portable task identity/profile mismatch');
  if (!['queued','running','paused','completed'].includes(task.status)) throw new Error('Portable task status is not resumable');
  if (!isHash(manifest.taskRecordSha256) || sha256(JSON.stringify(task, null, 2) + '\n') !== manifest.taskRecordSha256) throw new Error('Portable task record hash mismatch');
  const claim = store.idempotency[0];
  if (claim.taskId !== task.taskId || claim.key !== expectedClaimKey(task.taskId) || claim.requestHash !== identityHash(task)) throw new Error('Portable task idempotency claim mismatch');
  return { valid: true, sourceRunId: String(manifest.sourceRunId), taskId: task.taskId, pinnedCommitSha: task.pinnedCommitSha, status: task.status, storeRevision: store.revision, taskCount: 1, idempotencyClaimCount: 1 };
}

/** Import only creates a new store file; it never merges or overwrites an existing store. */
export async function importPortableTaskStoreArtifact({ storeText, manifestText, destinationPath, expectedSourceRunId, expectedTaskId, expectedCommitSha } = {}) {
  const validation = validatePortableTaskStoreArtifact({ storeText, manifestText, expectedSourceRunId, expectedTaskId, expectedCommitSha });
  if (typeof destinationPath !== 'string' || !destinationPath.trim()) throw new Error('destinationPath is required');
  const absolute = path.resolve(destinationPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  let handle;
  try { handle = await fs.open(absolute, 'wx', 0o600); }
  catch (error) {
    if (error?.code === 'EEXIST') throw new Error('Refusing to overwrite or merge an existing canonical task store');
    throw error;
  }
  try { await handle.writeFile(storeText, 'utf8'); await handle.sync(); }
  catch (error) { await handle.close().catch(() => {}); await fs.rm(absolute, { force: true }); throw error; }
  await handle.close();
  return { ...validation, destinationPath: absolute };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith('--')) throw new Error('Unexpected argument: ' + flag);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + flag);
    const names = { '--mode':'mode','--store':'store','--manifest':'manifest','--state-dir':'stateDir','--run-id':'runId','--task-id':'taskId','--commit':'commit','--output':'output' };
    const key = names[flag];
    if (!key) throw new Error('Unknown option: ' + flag);
    if (Object.hasOwn(out,key)) throw new Error('Duplicate option: ' + flag);
    out[key] = value;
  }
  if (!['create','validate','import'].includes(out.mode)) throw new Error('--mode must be create, validate, or import');
  if (!out.store || !out.manifest || !isRunId(out.runId) || !isTaskId(out.taskId) || !isSha(out.commit)) throw new Error('--store, --manifest, numeric --run-id, valid --task-id, and full --commit are required');
  if (['create','import'].includes(out.mode) && !out.output) throw new Error(out.mode + ' mode requires --output');
  return out;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const storeText = await fs.readFile(path.resolve(args.store), 'utf8');
  const manifestPath = path.resolve(args.manifest);
  if (args.mode === 'create') {
    const result = createPortableTaskStoreArtifact({ storeText, sourceRunId: args.runId, expectedTaskId: args.taskId, expectedCommitSha: args.commit });
    const outputPath = path.resolve(args.output);
    if (outputPath === manifestPath) throw new Error('Portable store output and manifest paths must be distinct');
    let outputCreated = false;
    try {
      await fs.writeFile(outputPath, result.portableStoreText, { flag: 'wx', mode: 0o600 });
      outputCreated = true;
      await fs.writeFile(manifestPath, result.manifestText, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (outputCreated) await fs.rm(outputPath, { force: true }).catch(() => {});
      throw error;
    }
    process.stdout.write(JSON.stringify({ valid: true, taskId: result.manifest.taskId, sourceRunId: result.manifest.sourceRunId, storeSha256: result.manifest.storeSha256, outputPath, manifestPath }) + '\n');
    return;
  }
  const manifestText = await fs.readFile(manifestPath, 'utf8');
  if (args.mode === 'validate') {
    process.stdout.write(JSON.stringify(validatePortableTaskStoreArtifact({ storeText, manifestText, expectedSourceRunId: args.runId, expectedTaskId: args.taskId, expectedCommitSha: args.commit })) + '\n');
    return;
  }
  const result = await importPortableTaskStoreArtifact({ storeText, manifestText, destinationPath: args.output, expectedSourceRunId: args.runId, expectedTaskId: args.taskId, expectedCommitSha: args.commit });
  process.stdout.write(JSON.stringify({ ...result, imported: true }) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write('BOAT portable task-store artifact error: ' + error.message + '\n'); process.exitCode = 1; });
}

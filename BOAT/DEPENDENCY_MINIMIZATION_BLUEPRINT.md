# BOAT Dependency-Minimization Blueprint

**Date:** 2026-10-12  
**Status:** Architecture decision for the next implementation phase  
**Repository:** `TrendforgeHQ/Trendforgehq.github.io`  
**Decision:** Do not add Supabase or another hosted backend as a prerequisite at this stage.

## Mission

Build BOAT as TrendForge-owned editorial intelligence and workflow code. Keep external services replaceable and optional wherever possible. A quota, provider outage, or network failure must not erase state or disable deterministic audits.

The goal is not to eliminate every dependency at any cost. The goal is to minimize mandatory dependencies, preserve useful work during failures, and make every remaining dependency visible and bounded.

## Verified starting point

- The deployed site uses Next.js static export (`output: 'export'`) and GitHub Pages. The current Control Center reads build-time snapshots; it is not a server runtime.
- The repo already contains Node.js audit, evidence-lineage, proposal, catalogue, and test scripts. The package manifest has Next/React for the UI and TypeScript/tsx development dependencies; many BOAT scripts use Node built-ins.
- BOAT Offline Tests is a read-only CI workflow with `contents: read`; it runs offline tests and a published-root lineage audit. It is distinct from the production publishing workflow.
- The production publishing workflow is scheduled and has provider secrets/write permissions. It must not become a browser-triggered BOAT endpoint.
- Existing audit limitations remain real: exact hashes establish byte identity/provenance, not semantic truth; semantic support must remain `unknown` or `not_verified` unless actually checked.
- PR #35 and PR #37 are drafts and unmerged. This blueprint branch is stacked on PR #37. Do not change `main`.

## Dependency policy

### Mandatory core: owned by this repository

1. Deterministic audit and policy logic.
2. Explicit task state machine and resumable checkpoints.
3. Versioned JSON schemas and portable report formats.
4. Evidence references, exact input hashes, run/commit identity, and append-only audit events.
5. Test fixtures and regression tests.
6. Permission checks and a fail-closed proposal/repair boundary.

Use Node's built-in libraries for core hashing, file handling, JSON, and test utilities where practical. Do not add a package just to do something a built-in can safely do.

### Optional capabilities: adapters, never core prerequisites

- AI model providers for semantic reasoning and drafting.
- External web retrieval for source freshness and independent corroboration.
- Remote task storage/authentication when a real multi-device live workspace is justified.
- Image generation, publishing, and distribution services.

Every adapter must have a timeout, explicit invocation budget, structured error states, and deterministic tests. If an adapter is unavailable or out of budget, save the partial result and report `blocked`/ `needs_review`; do not silently downgrade a truth check to a pass.

## Proposed architecture

```text
Static Control Center
        |
        | later: authenticated task request (not implemented yet)
        v
Task contract + state machine (repository-owned, provider-independent)
        |
        +--> Read-only article catalogue and structure audits
        +--> Evidence/provenance checks
        +--> Optional web-retrieval adapter (bounded)
        +--> Optional AI adapter (disabled by default; budgeted)
        |
        v
Portable task record + checkpoint + findings + audit events
        |
        v
Human review -> immutable repair proposal -> isolated branch -> tests
        |
        v
Human-controlled merge/publish only (outside initial slice)
```

This is a logical architecture, not a claim that the live task API or UI connection already exists.

## Persistence without a hosted database

Start with portable JSON records and deterministic task IDs. Keep the state format independent from its storage location.

- **Local run:** state can live in an explicitly selected workspace directory.
- **GitHub Actions run:** checkpoint/report can be retained as a workflow artifact; artifacts are not a permanent database and may expire.
- **Future storage adapter:** can use a database only if required, without changing the task contract or audit engine.

Never write task state to `main` automatically. Never commit credentials or sensitive user input into public reports. For concurrent writers, use version checks/atomic replacement or fail with a conflict; do not silently overwrite newer state.

## Execution tiers and quota behavior

| Tier | Capability | External AI credits | Required behavior |
|---|---|---:|---|
| 0 | Local deterministic checks and saved-evidence audits | 0 | Always available when repository/runtime is available |
| 1 | Bounded read-only published catalogue audit | 0 | Checkpoint between batches; resume without repeating completed work |
| 2 | Public-web retrieval for selected claims | Usually no model credits, but network/rate limits apply | Domain/URL limits, timeouts, cache, retry cap, source timestamps |
| 3 | AI semantic review or drafting | May consume provider quota | Disabled unless explicitly configured; per-task call/token budget; preserve partial results |
| 4 | Repair execution | No automatic provider assumption | Requires explicit approval tied to proposal hash, isolated branch, tests, and human-controlled merge |

“Zero AI credits” does not mean unlimited compute or unlimited network access. GitHub Actions and public websites have their own limits. The system must expose those limits rather than promise unlimited operation.

## First implementation slice

Implement the repository-owned task core before adding any external service:

1. Define a versioned task contract with task ID, task type, pinned commit SHA, status, created/updated timestamps, cursor/checkpoint, completed units, findings, errors, and budget counters.
2. Add deterministic create/update/checkpoint functions with strict state transitions and schema validation.
3. Add idempotency: re-running the same task/input must not duplicate completed findings; a different commit or task configuration creates a different identity.
4. Add safe local persistence with atomic writes and conflict detection; keep the storage adapter replaceable.
5. Add offline tests for resume, duplicate execution, corrupt state, stale checkpoint, interrupted batches, unknown states, and input immutability.
6. Connect the task core to the existing read-only catalogue audit only after its input/output contract is verified. No model or network access in this slice.
7. Export a machine-readable report and a human-readable summary; keep unknown/blocked separate from pass/fail.

### Acceptance criteria

- A complete deterministic audit runs with AI/network adapters disabled.
- An interrupted audit resumes from its last validated checkpoint.
- Re-running a completed batch is idempotent.
- Input article and evidence bytes remain unchanged.
- Task state survives a process restart in local mode.
- Invalid/corrupt/stale state fails closed with a useful reason.
- The task is pinned to one commit; repository changes during execution cannot silently change its inputs.
- Tests run in a dedicated offline workflow with read-only permissions.
- No publishing workflow, provider/image call, secret, production gate, article, or `main` branch is touched.

## Later phases

- **Phase A:** task contract, local persistence, checkpoints, deterministic tests.
- **Phase B:** read-only catalogue task runner and portable report/artifact.
- **Phase C:** bounded public-web retrieval with cache and rate controls.
- **Phase D:** optional model adapter for semantic support review, explicit budgets and graceful failure.
- **Phase E:** authenticated live Control Center and durable shared history, only after a security/hosting decision.
- **Phase F:** immutable proposal approvals and isolated-branch repairs; still no auto-merge/publish.
- **Phase G:** measured learning loop from human-reviewed outcomes, with regression fixtures and false-positive/false-negative tracking.

## Security and non-goals

- No GitHub token, provider key, or privileged secret in browser code.
- Do not use the scheduled publishing workflow as a general task runner.
- Do not let a BOAT task dispatch publishing or image-generation workflows.
- Do not automatically change article content, merge a PR, or publish.
- Do not claim the bot has learned merely because it stores logs; learning needs reviewed labels, measured outcomes, and tests.
- Do not add Supabase or any other external backend now. Revisit only when a concrete requirement cannot be met with the first portable task core and a cost/quota/security comparison is documented.

## Current implementation status

This document records the architecture decision and proposed acceptance criteria. The task state machine, local persistence, and resumable runner are **not yet implemented by this documentation change**. They must be added in a separate isolated code commit with tests and verified CI.


## Implementation progress — task state core

Added `scripts/boat-task-state.mjs`, `BOAT/schemas/task-record.schema.json`, and `scripts/test-boat-task-state.mjs` on the dependency-minimization branch. This first code slice uses Node built-ins only and covers task identity pinned to a commit, explicit transitions, resumable checkpoints, idempotent findings, default-zero AI/web budgets, atomic local JSON persistence, and revision/lock conflict checks. CI validation is pending. The catalogue audit worker and end-to-end resume integration are not implemented yet.


## 2026-10-12 — Input revision binding and first CI failure
- Initial task-state integration run [38220909162](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38220909162) exposed a test assertion mismatch: the implementation's configuration-mismatch message was more specific than the test's expected regex. The other newly added task-state tests passed in that run; the overall workflow failed, so no green result is claimed.
- Hardened the catalogue runner to verify `--commit` equals the actual checked-out Git commit, preventing an arbitrary supplied SHA from being presented as the audited input revision.
- Updated the integration test to use the checked-out SHA and separately test a task record whose stored pinned commit does not match.
- Next validation: rerun the offline suite and inspect the new run's test output. No publishing/provider/image workflow was dispatched.


## Validation update — 2026-10-12

The dependency-light task-state and resumable catalogue worker implementation passed BOAT Offline Tests run [38221034281](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38221034281). The task-state tests and pause/resume integration tests passed, and the read-only published-root lineage audit completed. This verifies deterministic structural execution only; semantic support, source freshness, live backend/authentication, and repair execution remain out of scope.


## Latest validation — 2026-10-12

BOAT Offline Tests run [38221180437](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38221180437) passed after adding checkout commit and clean-input guards. Task state and pause/resume integration tests passed, and the read-only published-root lineage audit completed. The scope remains structural and offline; no live backend, semantic fact-check, or repair execution is claimed.


## Phase B implementation update — combined read-only review task

The resumable worker now orchestrates the existing structural catalogue audit, archived evidence coverage, exact-byte lineage, published review queue, and archived claim-level report diagnostics. The report retains provenance and current-text-match diagnostics but never asserts independent semantic verification. Task profile version 2 prevents resuming older structural-only state under the new semantics. CI validation is pending for this integration.
## 2026-10-12 — Combined review integration test correction (CI pending)

- First combined-review run [38222862267](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38222862267) exposed a brittle test assumption: it expected at least one structural finding in the first batch, although the existing structural audit can legitimately return zero findings for those articles. The combined audit safety test passed.
- Replaced the brittle assertion with reconciliation of category counts against the total findings count. Exposed and asserted the review queue's read-only, no-auto-repair, and no-automatic-publication flags in the task summary.
- Re-run the full offline workflow and inspect results before treating the combined integration as validated.

---



## 2026-10-12 — Combined review queue CI passed
- BOAT Offline Tests [38222968795](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38222968795) passed after correcting the zero-findings test assumption and asserting read-only/no-repair/no-publication invariants.
- Follow-up cleanup removes redundant duplicate-slug reporting and binds claim-history findings to the current article SHA-256; validation of this cleanup is pending.


## Latest validation and next step — 2026-10-12

Combined editorial audit code commit `7af241d74736468c0ff0ae4ce06ae7c4fa38e1e7` passed BOAT Offline Tests run [38223070482](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38223070482), including pause/resume and explicit no-auto-repair/no-auto-publication assertions. The task is structural and historical-triage only; it does not independently establish semantic truth or source freshness. Next planned slice: produce a deterministic portable human-readable report from the saved task record, then design authenticated Control Center connectivity as a separate security-boundary change.


## Phase B follow-up — human-readable task report

Added a deterministic Markdown renderer and wired the worker to refresh a sibling report after each saved checkpoint and final status transition. Task profile v3 stores the combined audit summary in the task configuration and blocks resume if that summary drifts for the pinned inputs. Renderer tests cover deterministic output, escaped content, claim/report provenance, CLI/file output, and refusal to overwrite the canonical JSON task record. CI validation is pending.

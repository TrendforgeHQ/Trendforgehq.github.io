## Implementation update — opt-in canonical-store catalogue runner (2026-10-12)

- Added `registerStoredTask()` and optional `--task-store` support to the existing read-only catalogue runner. The unified store is authoritative for task/checkpoint/findings state; JSON task files are compatibility snapshots only in this mode.
- Explicit resume reads canonical store state, rejects missing store records, and skips completed article unit IDs. Checkpoint and findings are committed in one store replacement; reports are regenerated at a stable path.
- Validation [run 38229900046](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38229900046): 186 tests passed, 0 failed, and the read-only lineage audit passed.
- The manual workflow has **not** been switched to this mode. Hosted runners are ephemeral, so saving the store to a local runner path alone does not establish cross-run persistence. A future workflow change needs an explicitly versioned store artifact with integrity/provenance checks and migration tests.
- No new dependencies, hosted backend, AI/web usage, publishing, article edits, workflow dispatch, merge, or `main` changes.

---

## Implementation update — atomic task-store progress writes (2026-10-12)

- Added `updateStoredTask()` so a task's checkpoint and findings can be committed in the same atomic JSON-store replacement, with exclusive locking and expected-task-revision checks.
- Offline CI [38228963259](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38228963259) passed 184 tests, 0 failures, and the read-only published-root lineage audit.
- No new dependency or hosted database was introduced. This remains a single-local-workspace persistence primitive.
- **Not yet complete:** the existing catalogue runner still uses its per-task JSON file and does not yet treat the unified task store as canonical. Next phase is a separately tested opt-in adapter, preserving manual workflow artifact compatibility. Cross-run hosted persistence, live auth/API, and automatic execution remain unproven/out of scope.

---

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


## Report renderer hardening follow-up

Resume validation compares audit-component summaries through recursive canonicalization, matching the task-state factory. The Markdown renderer escapes HTML/Markdown metacharacters from untrusted article and claim text; regression coverage includes script-like text. CI validation pending.
## 2026-10-12 — Report renderer integration fixes (CI pending)

- Latest CI exposed three renderer integration issues: the module executed its CLI when imported by the worker, Node's fs/promises module was called through a nonexistent nested .promises property, and the human report displayed raw underscore status instead of a readable label.
- Added a direct-execution guard, corrected promise-based filesystem calls, and render semantic statuses as readable labels. Re-run the offline suite before treating report generation as verified.

---



## Latest report validation — 2026-10-12

Report renderer and combined resumable task code commit `8fbc0eb2543bde5253251e22b9610e8b624c32dc` passed BOAT Offline Tests [38223584210](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38223584210). Deterministic rendering, escaping, provenance display, CLI/file output, pause/resume, combined audit safety, and the read-only lineage audit passed. JSON remains canonical; Markdown is a derived reviewer-facing report. Next step is a separate security design for authenticated Control Center connectivity.


## Operational entry point — manual-only read-only audit

Added `.github/workflows/boat-manual-audit.yml`, with only a manual trigger, read-only `contents`/`actions` permissions, no checkout credentials, and no provider secrets or production-publish coupling. It can run a complete/bounded task, upload the portable JSON checkpoint and Markdown report for 14 days, and resume only from a prior run artifact using the exact original commit SHA. Static safety tests are added; CI validation is pending and the workflow has not been manually dispatched.


## Manual workflow expression correction

The manual workflow's GitHub Actions expression markers were corrected after detecting literal template-escape backslashes in the committed YAML. Current-head CI is pending; no manual dispatch has been run.


## Manual workflow artifact/resume hardening

Checkpoint/report files are uploaded separately from the task summary so a downloaded checkpoint lands directly in the worker state directory. A recovery step discovers the task ID from saved JSON if execution stops after a checkpoint but before normal output. Current-head CI pending; workflow not manually dispatched.


## Manual workflow validation — 2026-10-12

Static workflow and task tests passed in BOAT Offline Tests [38224116086](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224116086). This validates trigger isolation, read-only permissions, artifact layout, report rendering, and local pause/resume logic. The manual workflow has not itself been dispatched, so cross-run artifact download/resume is still unverified. The next operational step is a controlled manual run; no production publishing workflow is involved.


## 2026-10-12 — Control Center security boundary follow-up

The companion design is recorded in [`CONTROL_CENTER_SECURITY_BOUNDARY.md`](CONTROL_CENTER_SECURITY_BOUNDARY.md). The current Control Center is still a static snapshot and must not be treated as a live authenticated console. Before any live integration, require a server-side broker, least-privilege manual worker, request/task schemas, negative authorization/resume tests, and explicit cost/quota/security comparison. No backend/auth product has been selected. The manual workflow has static CI validation only; actual dispatch and cross-run artifact resume remain unverified. Do not merge to `main` solely to unlock dispatch, and do not connect BOAT to the publishing workflow.


## Security boundary validation — 2026-10-12

The companion security proposal `BOAT/CONTROL_CENTER_SECURITY_BOUNDARY.md` and its record updates passed BOAT Offline Tests [38224801135](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224801135) on commit `b060f4b58e470e49fb421fe3bb796e2745e20508`. The offline regression suite and read-only published-root lineage audit passed. This validates the current PR checkout, not a live API/authentication broker or manual workflow artifact resume. The next code step is offline validation of request/task schemas and artifact manifest/resume rejection cases; no hosting product is selected.


## Follow-up records validation — 2026-10-12

The follow-up BOAT record update at `89d530359996a1ef772896e72b7b5e3a803a387a` passed BOAT Offline Tests [38224894861](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224894861), including offline regression tests and the read-only published-root lineage audit. Manual dispatch, cross-run artifact resume, and live authentication remain unverified.


## 2026-10-12 — Portable checkpoint provenance implementation

Added `scripts/boat-task-artifact-manifest.mjs` and offline tests. The manifest binds source Actions run ID, task ID/type, pinned commit, audit profile/config hash, and exact task JSON/report hashes. The manual-only workflow validates it before resume and refreshes it only after successful validation. BOAT Offline Tests [38225314231](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38225314231) passed on `ec6eb586234487ced58804929c6c0d36cc988bc3`, including the offline regression suite and read-only lineage audit. Manual dispatch and cross-run artifact resume remain unverified; this feature is still isolated from the publishing workflow.


## 2026-10-12 — Offline request/response contract slice

Added `scripts/boat-task-contract.mjs`, `scripts/test-boat-task-contract.mjs`, and request/response schemas under `BOAT/schemas/`. The contract accepts only bounded read-only catalogue audits pinned to a full commit SHA, requires an idempotency key, rejects additional fields, and fixes AI/web budgets at zero. Authorization decisions require trusted server context and enforce operator/CSRF/origin/rate-limit, repository/workflow/task/commit allowlists, batch caps, budget policy, and duplicate-key rejection. The contract is pure code only; it does not authenticate users, persist idempotency keys, submit a workflow, or connect the static Control Center to a backend. The offline CI path filter now includes the contract tests; latest CI result is pending.


## 2026-10-12 — Contract slice CI result

BOAT Offline Tests [38226609696](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38226609696) passed **168/168 tests**, and the read-only published-root lineage audit succeeded. The new contract tests cover bounded request shapes, strict response fields/counters, fail-closed authorization decisions, repository/workflow/task/commit allowlists, zero budgets, idempotency replay signals, and schema smoke checks. This is not a live broker/auth implementation; trusted context creation, actual session security, and persistent idempotency are still future server-side work.

## 2026-10-12 — Local idempotency ledger and lifecycle boundary

- Added a portable, versioned JSON idempotency ledger using Node built-ins only. It hashes canonical validated request content and preserves the first task ID for an identical retry; a reused key with changed request content is rejected.
- Local writes use an exclusive lock, atomic replacement, and fail-closed handling for corrupt files or lock contention. Stale locks require explicit operator recovery; they are never silently removed.
- Task lifecycle transition tests now explicitly cover pause/resume, review completion, blocked/failed recovery, and the completed terminal state.
- This provides single-workspace persistence only. It is not a distributed lock, not authentication, not a live API, and not an atomic transaction across task-record creation plus idempotency claim. Do not advertise exactly-once execution or connect this to Control Center until the crash window and broker boundary are resolved.
- No new dependency or hosted service; zero AI/web budget; no workflow dispatch, publishing, provider/image calls, merge, or `main` change. CI validation is pending inspection.

## 2026-10-12 — Lifecycle/idempotency validation result

- Latest BOAT Offline Tests run [38227586730](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38227586730) completed successfully on the current PR head: **176 test checks passed, 0 failed**; Control Center deterministic suite passed **37/37** and the read-only published-root lineage audit step completed successfully.
- The idempotency tests verified same-request replay returns the original task ID, changed-request key reuse conflicts without modifying persisted bytes, persistence survives reload, and lock/corrupt-state handling fails closed.
- Validation is for the offline/local implementation only. It does not establish distributed idempotency, a live API/auth broker, cross-run artifact resume, or atomic task-record-plus-ledger creation. No merge, dispatch, provider/web/image calls, publishing, or `main` change.

## 2026-10-12 — Atomic task store and crash recovery

- Added `scripts/boat-task-store.mjs`: one versioned JSON document stores task records and idempotency-key mappings together, so creating a task and claiming its key are committed in one atomic file replacement instead of two independent files.
- Added `scripts/test-boat-task-store.mjs`: task+claim consistency, restart replay, changed-request conflict with byte-preservation, interrupted-running recovery, checkpoint preservation, invalid input, corrupt store, dangling idempotency reference, and lock contention.
- Recovery turns persisted `running` tasks into `paused`, adds an explicit recovery note, preserves the last checkpoint, and does not execute work. Resuming still requires a separate explicit operator action.
- Offline CI on implementation head `692b7e63be3e2229ec32e878321f35eba0c038f4` passed **182 tests, 0 failures**, including the new task-store recovery tests and published-root lineage audit. The workflow-filter update was independently validated in [run 38228067483](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38228067483): offline regression suite and read-only published-root lineage audit both passed.
- Reduced CI churn by replacing the broad `BOAT/**` path trigger with `BOAT/schemas/**`; documentation-only edits no longer trigger BOAT Offline Tests. Task state/store/idempotency source and test files are explicitly included, along with schema files.
- Limits: single local filesystem/workspace only; no multi-machine coordination, live authentication/API, workflow dispatch, or production connection. Atomic rename protects the combined JSON update, but host/power-loss durability and cross-run hosted-runner persistence are not yet end-to-end proven. No new dependency, paid AI/web usage, publishing, article mutation, merge, or `main` change.

## 2026-10-12 — One-article review/repair vertical slice (offline)

- Added `scripts/boat-article-review-cycle.mjs` to connect the existing Article Doctor, evidence-lineage auditor, and sandbox structural repair engine into one deterministic review bundle for one exact published-article path.
- The review bundle records hashes for the exact article, claim report, evidence pack, and metadata; the proposal binds the full base commit, target path, before/after article hashes, exact candidate Markdown, and change list into a SHA-256 proposal identity.
- Application requires an explicit approval JSON that matches the proposal hash, base commit, target path, before/after hashes, reviewer identity, timestamp, and rationale. Stale article bytes, changed proposal contents, wrong commit, mismatched approval, rejected decisions, and non-allowlisted article paths fail closed.
- Approved output is written only to a new sandbox candidate outside `content/articles/`; the original article is never overwritten. Post-fix structural checks must be idempotent, and a learning record captures the reviewer decision, hashes, outcome, and explicit remaining limitations.
- Added offline tests for the complete audit → proposal → approval → sandbox candidate → post-fix verification → learning record path, plus tampering, stale bytes/commit, approval mismatch, artifact-hash mismatch, and no-overwrite protection. Updated BOAT Offline Tests path filters to include the new module and tests.
- Safety limits: no network/AI/provider calls, no production workflow dispatch, no article edit, no publishing, and no merge. A local approval file is not authentication; semantic factual support remains `not_verified`, the existing claim verifier has not been rerun by this structural-only slice, and human review/build/editorial gates remain required.
- Validation state at commit preparation: CI not yet run for this new slice. Do not claim the vertical slice is verified until the latest-head offline suite passes.
- Next: inspect CI on the exact commit, fix any failures, then use the cycle on a retained offline fixture. Do not run it against a live article for mutation or connect it to the manual/publishing workflow without a separately reviewed integration.

### First CI feedback and correction — 2026-10-12

The first run for the new vertical slice ([38231788176](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38231788176)) caught three issues in the new tests/CLI contract: an assertion expected different wording for the safe-path rejection, and the CLI test approval timestamp was in the future relative to the runner clock, which also masked the no-overwrite assertion. Updated the path error to state the allowlist and made the fixture approval timestamp unambiguously historical. This is a test/contract correction, not a production article change. Re-run CI on the corrected head before declaring the slice passing.

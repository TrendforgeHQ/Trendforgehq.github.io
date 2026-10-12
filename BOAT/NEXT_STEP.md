## 2026-10-12 — Manual-only audit workflow CI verified

- BOAT Offline Tests run [38224116086](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224116086) passed for the manual-workflow integration commit `e8a90bc0cb99f6c133d93239d4be104f517980d2` in the PR merge checkout.
- Confirmed static workflow tests pass: only `workflow_dispatch`, `contents: read` and `actions: read`, checkout credentials disabled, no production-publish/provider coupling, 14-day artifacts, and flat checkpoint/report artifact layout with task-ID recovery after interrupted runs.
- Renderer, combined audit pause/resume tests, and published-root lineage audit also passed in the same run.
- Workflow has not been manually dispatched; the CI validates workflow structure and the existing runner tests, not an end-to-end cross-run artifact download. Next: do a controlled manual test only after review, then use the generated report to refine claim-level review UX. No production publish workflow was run.

---

## 2026-10-12 — Manual audit artifact layout hardening (CI pending)

- Corrected GitHub Actions expressions in the manual-only workflow and split the portable checkpoint/report artifact from the optional summary artifact. This ensures the downloaded task JSON lands at the expected state-directory root for resume.
- Added a recovery step that discovers a saved task ID if a run is interrupted after checkpointing but before the normal summary output is produced.
- Expanded static workflow tests for artifact layout and recovery. CI pending; the workflow has not been manually dispatched.

---

## 2026-10-12 — Manual workflow expression fix (CI pending)

- Corrected GitHub Actions expression interpolation in the new manual workflow. The initial committed YAML contained literal escape backslashes before expressions because the workflow source was generated from a raw template; these have been removed so Actions receives the intended expressions.
- Static workflow-safety test and full offline CI must pass before calling the manual entry point ready. The workflow has not been dispatched.

---

## 2026-10-12 — Manual-only BOAT worker entry point added (CI pending)

- Added `.github/workflows/boat-manual-audit.yml`, triggered only by `workflow_dispatch`, with `contents: read`, `actions: read`, and checkout credentials disabled.
- It runs the existing BOAT resumable combined audit, uploads the portable JSON checkpoint and Markdown report for 14 days, and can resume a paused task by downloading its artifact from a prior run. Resume requires both task ID and prior run ID plus the exact original audit commit SHA.
- This workflow is independent of the scheduled production publishing pipeline. It has no provider secrets, no write permissions, no push/PR/schedule trigger, and no article edits, merges, or publication action.
- Added static workflow safety tests to the offline test suite. Current CI validation pending; workflow has not been manually dispatched.

---

## 2026-10-12 — Human-readable task report CI verified

- BOAT Offline Tests run [38223584210](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38223584210) passed for code commit `8fbc0eb2543bde5253251e22b9610e8b624c32dc`.
- Confirmed report tests pass for deterministic output, escaping, claim/report provenance, CLI stdout/file output, and refusal to overwrite task JSON. Resumable combined-audit tests also passed, including pause/resume and the no-auto-repair/no-auto-publication checks; the published-root lineage audit passed.
- Runner refreshes a sibling Markdown report after each saved batch and on final status/resume. Audit profile v3 stores the audit summary and checks it canonically before resume.
- Next: inspect the report output for reviewer usability, then plan the authenticated Control Center integration as a separate security-boundary change. Do not enable network/AI or repair execution yet.

---

## 2026-10-12 — Report renderer integration fixes (CI pending)

- Latest CI exposed three renderer integration issues: the module executed its CLI when imported by the worker, Node's fs/promises module was called through a nonexistent nested .promises property, and the human report displayed raw underscore status instead of a readable label.
- Added a direct-execution guard, corrected promise-based filesystem calls, and render semantic statuses as readable labels. Re-run the offline suite before treating report generation as verified.

---

## 2026-10-12 — Report renderer hardening and canonical resume comparison (CI pending)

- Before running the new report tests, reviewed two implementation details: task config is canonicalized with sorted object keys, so audit-summary comparison must use the same canonical comparison; the report renderer must escape HTML/Markdown metacharacters from article and claim content.
- Added canonical stable comparison for the stored audit summary and expanded report escaping tests with HTML-like and Markdown-like untrusted text.
- Current report/runner commit requires its own offline CI result; no pass is claimed for these latest fixes yet.

---

## 2026-10-12 — Human-readable task report implementation (CI pending)

- Added scripts/boat-render-task-report.mjs, a deterministic Markdown renderer for a saved BOAT task record. It displays task identity/status/progress, budgets, finding counts, claim-history provenance, and uncertainty/approval limits without network or AI calls.
- The resumable runner now writes a sibling .md report after each checkpoint and on completion/resume, so a paused task has a readable report too.
- Task profile bumped to version 3 and stores the deterministic audit-component summary in task config; resume blocks if the same commit produces a different component summary/profile, avoiding silent report-semantic drift.
- Added tests for deterministic rendering, escaped content, provenance fields, CLI stdout/file output, and protection against overwriting the task JSON. CI result pending.

---

## 2026-10-12 — Combined editorial audit CI verified

- BOAT Offline Tests run [38223070482](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38223070482) passed on code commit `7af241d74736468c0ff0ae4ce06ae7c4fa38e1e7`.
- Verified the combined resumable task covers structural catalogue checks, archived evidence coverage, exact-byte lineage, review-queue triage, and archived claim-history diagnostics. The bounded pause/resume test and the combined safety test passed; the read-only published-root lineage audit passed.
- Summary explicitly reports read-only mode and `automaticRepair: false`, `automaticPublicationDecision: false`. Claim findings carry current article SHA-256 plus archived report identity/hash and remain `not_assessed`/unknown until independently reviewed.
- Next: improve the actual review experience by producing a deterministic human-readable per-task report from the saved task record, then design the authenticated Control Center integration separately. Do not add AI/web calls or repair execution yet.

---

## 2026-10-12 — Combined review queue CI passed; provenance tidy-up pending CI

- BOAT Offline Tests run [38222968795](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38222968795) passed for combined structural/evidence/lineage/review-queue/claim-history integration, including task pause/resume and explicit no-auto-repair/no-auto-publication assertions.
- Follow-up cleanup removes a redundant duplicate-slug finding (the combined review queue already emits the per-entry identity finding) and attaches the current article SHA-256 to each archived claim-history finding. This follow-up commit requires its own CI result.

---

## 2026-10-12 — Combined review integration test correction (CI pending)

- First combined-review run [38222862267](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38222862267) exposed a brittle test assumption: it expected at least one structural finding in the first batch, although the existing structural audit can legitimately return zero findings for those articles. The combined audit safety test passed.
- Replaced the brittle assertion with reconciliation of category counts against the total findings count. Exposed and asserted the review queue's read-only, no-auto-repair, and no-automatic-publication flags in the task summary.
- Re-run the full offline workflow and inspect results before treating the combined integration as validated.

---

## 2026-10-12 — Combined review-queue task integration (CI pending)

- Upgraded the resumable worker from structural-only findings to a combined read-only review task: structural catalogue checks, historical evidence coverage, exact-byte lineage, the existing published review queue, and archived claim-verifier report diagnostics.
- Claim-level findings retain saved status, claim text, source/passage metadata, report identity/hash, and whether text was found in current article bytes. Every finding explicitly sets semantic support to not assessed/unknown and requires human approval; historical PASS is not current fact verification.
- Task identity now uses audit version 2 and an explicit combined profile; older structural-only task records are rejected for resume instead of silently mixing report semantics.
- The runner's cleanliness guard now covers article Markdown, archived attempts, lineage manifests, root verifier snapshots, and all audit modules.
- Tests have been updated for combined audit components and claim-history safety. CI result for this code commit is pending; no green result is claimed yet.

---

## 2026-10-12 — Latest task-core validation (green)

- BOAT Offline Tests run [38221180437](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38221180437) passed on the PR merge checkout containing code commit `4305a5f7582222aafab05609fedf1b08ebea9dad`.
- Confirmed the new state tests and catalogue task pause/resume integration tests passed, and the read-only published-root lineage audit completed successfully.
- The runner now requires the supplied commit to match the actual checkout and rejects uncommitted changes to the catalogue/audit input files.
- This validates deterministic structural execution only. It does not prove semantic factual support or provide live Control Center auth/task API/repair execution.

---

## 2026-10-12 — Audit input cleanliness guard added (CI pending)

- Catalogue runner now also refuses to run if `lib/articles.ts`, `scripts/boat-published-catalogue-audit.mjs`, or the runner itself has uncommitted tracked changes. This closes the gap where a clean HEAD SHA could otherwise be paired with dirty audit inputs.
- Current code head: `4305a5f7582222aafab05609fedf1b08ebea9dad`. Re-run the offline suite and inspect the result before calling this hardening validated.

---

## 2026-10-12 — Resumable audit core CI result

- BOAT Offline Tests run [38221034281](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38221034281) completed successfully on the PR merge checkout containing task-core implementation commit `27b67ebffc98868f00c6a97f337c9fdf731bd942`.
- Confirmed the three catalogue-runner integration tests passed (bounded pause/resume, commit/config mismatch refusal, invalid-argument refusal) and all eight task-state tests passed. The full offline workflow, including the read-only published-root lineage audit, succeeded.
- The runner checks that `--commit` equals the checked-out Git SHA; it does not accept a syntactically valid but unrelated SHA as audit provenance.
- This validates the current code implementation, not a live Control Center backend, semantic factual truth, web retrieval, or repair execution. No provider/image calls or publishing workflow were run.

---

## 2026-10-12 — Worktree commit binding correction awaiting CI

- Current head includes a guard that requires the explicit task commit to equal the actual checked-out Git SHA; the integration test now derives its fixture SHA from the same checkout.
- The previous run [38220909162](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38220909162) failed only at the batch-configuration assertion message; task-state tests and the initial pause/resume test passed. The assertion was corrected and commit pinning was strengthened afterward.
- Validation of the current head remains pending. Do not treat the previous failure as a pass.

---



## 2026-10-12 — Input revision binding and first CI failure
- Initial task-state integration run [38220909162](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38220909162) exposed a test assertion mismatch: the implementation's configuration-mismatch message was more specific than the test's expected regex. The other newly added task-state tests passed in that run; the overall workflow failed, so no green result is claimed.
- Hardened the catalogue runner to verify `--commit` equals the actual checked-out Git commit, preventing an arbitrary supplied SHA from being presented as the audited input revision.
- Updated the integration test to use the checked-out SHA and separately test a task record whose stored pinned commit does not match.
- Next validation: rerun the offline suite and inspect the new run's test output. No publishing/provider/image workflow was dispatched.
## 2026-10-12 — Resumable catalogue worker added (CI pending)

- Added `scripts/boat-run-catalogue-task.mjs`, a bounded, read-only runner over the existing `auditPublishedCatalogue` function. It processes batches, checkpoints completed article units, saves state after each batch, and can resume with the same pinned commit/config.
- Added `scripts/test-boat-run-catalogue-task.mjs` for pause/resume, no-provider/no-network budget, completed-task idempotency, pinned-commit/config mismatch, and invalid CLI arguments.
- This worker is structural only: it does not establish semantic claim support or source freshness and does not edit articles.
- Next: inspect this commit's offline CI; if green, review runner logs and harden any issues before connecting a Control Center task API. No live API, authentication, external backend, or repair execution is enabled.

---

## 2026-10-12 — Dependency-minimized task-state core (implementation started)

- Added `scripts/boat-task-state.mjs`, its JSON Schema contract, and `scripts/test-boat-task-state.mjs`.
- The core uses Node built-ins only; deterministic task identity is pinned to task type, config, and a full commit SHA. It includes explicit state transitions, idempotent checkpoints/findings, default-zero AI/web budgets, atomic local JSON writes, an exclusive writer lock, and optimistic revision checks.
- The test suite is now part of the existing offline `node --test scripts/test-boat-*.mjs` glob. Actual CI result is pending; do not claim the code is validated until logs are inspected.
- Next: inspect the published-catalogue audit CLI contract, connect it as a bounded read-only task worker, then test interruption/resume end to end. Do not add network/model calls in that slice.

---

## 2026-10-12 — Dependency-minimization decision

**Decision:** Do not add Supabase or another hosted backend as a prerequisite. Build the repository-owned, provider-independent task core first. See [DEPENDENCY_MINIMIZATION_BLUEPRINT.md](DEPENDENCY_MINIMIZATION_BLUEPRINT.md).

**Next implementation:** create a versioned task contract and deterministic local state/checkpoint module; add offline tests for resume, idempotency, corrupt/stale state, and atomic persistence. Then connect it to the existing read-only published-catalogue audit only after checking that CLI's exact contract. AI and web adapters remain optional and disabled in the first slice.

**Guardrails:** no `main` edits, auto-merge/publish, publishing workflow dispatch, provider/image calls, new hosted backend, browser secrets, or gate changes. Keep task state portable and pinned to an input commit. Do not label semantic support verified unless it was actually checked.

---

## Verification follow-up — 2026-10-12

**PR #37's own CI:** BOAT Offline Tests run [38219593540](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38219593540) completed successfully after this audit and record update. Its log confirms the existing Control Center deterministic suite passed **37/37**, and the read-only published-root lineage audit completed. This is documentation-branch regression coverage; no live backend exists yet.

**Next:** select/confirm the free-tier authenticated backend/identity boundary before implementing the task API. The user previously constrained TrendForge to free GitHub Pages hosting and has not selected an external backend provider. Do not put credentials in the static client or trigger publishing from a browser request.


## 2026-10-12 — Control Center vertical-slice audit

**Verified branch-head CI:** PR #35 head `afbacc3649e70af3561d77981d6f246afc43938b` has successful BOAT Offline Tests run [38136303910](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38136303910) and Control Center QA run [38136303936](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38136303936). The offline log includes the 37/37 Control Center deterministic checks. These runs validate that exact branch head, not a new implementation.

**Completed:** inspected `next.config.mjs`, Control Center page/test/workflow, and publishing workflow. Added [CONTROL_CENTER_INTERFACE_AUDIT.md](CONTROL_CENTER_INTERFACE_AUDIT.md). Confirmed `output: 'export'`: GitHub Pages is a static frontend and cannot host the privileged chat/task API. The current Control Center uses build-time committed snapshots, not live task state.

**Next action:** identify/confirm an authenticated external backend and identity boundary, then implement a minimal read-only task endpoint + worker and connect the UI to real task states. No mock chat, client-side credentials, publishing dispatch, paid provider calls, article writes, or main-branch changes.

# BOAT Next Step

## Current status and next action — 2026-10-11

**Latest verified offline baseline:** BOAT Offline Tests run [38126927243](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126927243) passed **129/129**, 0 failed, 0 skipped. The new published-lineage-manifest synthetic contract test is included and passed. Control Center checks passed **37/37** and its production build passed in [run 38126992154](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992154).

**Completed in this step:** added `scripts/boat-published-lineage-manifest.mjs` and `scripts/test-boat-published-lineage-manifest.mjs`. The builder binds exact UTF-8 bytes for article, claim report, evidence pack, article brief, and current-run marker to a workflow run/SHA. It requires a same-run generated-article marker, matching canonical articlePath, a PASS report with claims, and one uniquely matching evidence-pack candidate with sources. Invalid or ambiguous input fails closed. Explicit workflow path filters were added.

**Scope boundary:** this is an offline manifest builder, not yet integrated into `.github/workflows/publish.yml` or Control Center. Hashes prove byte identity/provenance, not semantic truth or source freshness. No provider/publishing workflow was run; no article was changed; `main` remains untouched; PR #35 remains draft/unmerged.

**Immediate next action:** inspect branch-head CI at 8fc20d44eccb269ef530e7f57b939cfa171a6686. The TypeScript declaration fix is committed; offline tests and production build must both pass before this step is verified. If green, review the full PR diff and confirm publish-time manifest persistence and Control Center states. Integration must bind only the current generated article and current workflow's successful claim report/evidence pack, preserve existing gates, and produce UNKNOWN rather than a false PASS when inputs are absent. Add end-to-end synthetic tests before wiring into the scheduled publishing workflow.

## Historical implementation log — artifact recovery and passage-ID reconciliation

Risk: low. Provider cost: none. Production behavior change: none.

### Verified baseline before adapter
- Draft PR #35: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35
- Previous branch-head offline suite: [run 38112892985](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112892985), **39 passed, 0 failed, 0 skipped**.
- Factual repair proposals remain proposal-only, require human approval, and never apply changes.

### Actual artifact inspection
Inspected the archived claim-blocked attempt:
`data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked/`
- `article.md` is the saved article text.
- `claim-verification.json` contains `claims[]`, `sources[]`, claim `sourceId`, `bestUrl`, `sourceRole`, `bestPassageId`, and `provenanceFactMatches[]`.
- `metadata.json` records `workflowRun` and `workflowSha`, but does **not** record article/report/evidence-pack SHA-256 hashes.
- The claim-blocked archived directory does **not** contain a canonical evidence-pack JSON file, but the original workflow artifact can preserve it in the earlier generated-pending-verification directory.
- Legacy `bestPassageId` uses values such as `S1-FF1,S2-FF6`, unlike the proposal engine's canonical `S1-P1` passage IDs. The adapter must preserve these values, not rewrite them or infer a passage match.
- Therefore this archived attempt cannot prove same-run article/report/evidence-pack lineage. Its adapter result must remain `unknown`; this is expected fail-closed behavior, not a test failure.

### Implemented in this step
- Added `scripts/boat-artifact-adapter.mjs` as a read-only adapter for saved article, claim-report, evidence-pack, and metadata bytes.
- It preserves existing claim fields and legacy passage IDs without invented conversions.
- It trusts only hashes recorded in metadata; it does not manufacture hashes and claim that they establish same-run provenance.
- Missing canonical evidence pack or recorded hashes emits explicit adapter findings and forces proposal status to `unknown`.
- CLI writes a separate output, refuses to overwrite inputs or an existing output, and does not modify the article.
- Added `scripts/test-boat-artifact-adapter.mjs` for compatible artifact mapping, legacy passage preservation, missing-lineage fail-closed behavior, malformed JSON, and proposal schema-contract assertions.
- The existing offline workflow's `scripts/test-boat-*.mjs` glob includes the new tests without requiring a production workflow change.

### Validation
- Adapter + schema-contract check [run 38114116567](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114116567): **44 passed, 0 failed, 0 skipped**.
- Real archived-attempt CLI integration [run 38114233407](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114233407): **45 passed, 0 failed, 0 skipped**. The test confirms `unknown` status when the evidence pack and recorded hashes are absent, and verifies the original article/report/metadata bytes are unchanged.
- No provider, external-source fetch, image generation, site build, or publishing workflow was run.
- No claim is made that the archived historical attempt has valid same-run evidence lineage.

### Recovered artifact finding (2026-10-11)
1. All three original GitHub Actions artifacts were still available and downloaded from their exact run IDs. Each contains the matching generated-pending-verification folder and canonical authoritative-evidence-pack.json; the same sibling folders and packs are also present in the repository.
2. Added `scripts/boat-run-artifact-recovery.mjs` to audit the real root `candidates[]` envelope, select exactly one candidate by exact `article-brief.json` title, verify run/SHA metadata and report source-ID/URL mapping, and emit recovery-time hashes without claiming those hashes were recorded at generation time.
3. Recovery results and checksums are recorded in `BOAT/ARTIFACT_RECOVERY.md`. Runs 38085367295 and 37996683799 have exact claim-text coverage 15/15 and 18/18; run 37696062759 is only 4/7 and must not be used for claim-specific repairs until reconciled.
4. Added a real-fixture integration test across all three checked-in article/report/brief/pack combinations. Latest CI [run 38115430698](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38115430698) passed **57/57**. The exact-text resolver uniquely maps 12/15, 12/18, and 4/7 claim passages; it leaves the rest unresolved and never rewrites original reports. Never translate `Sx-FFn`/`Sx-BODY` into `Sx-Pn` unless the original saved text matches exactly one canonical passage; otherwise retain `unknown`.
5. Historical next item (completed later in this branch): the separate recovered proposal-input adapter was added, with unique exact-text passage mapping and review-only output. Later entries below record the follow-on schema, eligibility report, and proposal-engine handoff work.
6. Keep the PR draft/unmerged. Any future accepted factual correction must go through the existing claim verifier and all required editorial, image-safety, and build gates.

### Guardrails
- Do not change `main`; do not merge PR #35 automatically.
- No paid providers or publishing runs.
- No article edits or automatic repair application.
- Existing evidence, claim-verification, editorial, image-safety, and build gates remain authoritative.

## Proposal-input adapter implementation (2026-10-11)

- Added `scripts/boat-recovered-proposal-input.mjs`: binds current article/report/brief/canonical-pack bytes to the recovery audit's recovery-time hashes, requires exact unique candidate selection, rechecks source IDs/URLs, and exposes per-claim inputs only when the exact claim is present in the article and its source passage maps uniquely to canonical `Sx-Pn`.
- Added `scripts/test-boat-recovered-proposal-input.mjs` with synthetic lineage/hash/missing-claim/ambiguous-passage cases and all three real archived attempts. Validation passed in [run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288): 64 passed, 0 failed, 0 skipped.
- Recovery-time hashes are not represented as original generation-time metadata. Output always says `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`, and `replacementTextGenerated: false`.
- Next: inspect branch-head offline CI, fix any regression, then record observed eligible/blocked/unknown counts. Keep PR #35 draft and unmerged.


CI caught an important intersection issue in run 38117347327: run 37696062759 has 4/7 exact claim strings in the article and 4/7 unique passage mappings, but those sets do not fully overlap. Only claims 6 and 9 satisfy both requirements, so the correct eligible count is 2. The test expectation was tightened accordingly; revalidation passed in [run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288), 64/64.



## Recovered proposal-input adapter — validation pending

- Added `scripts/boat-recovered-proposal-input.mjs`: consumes a recovery-audit manifest plus the exact recovered article, claim report, brief, and canonical pack bytes.
- The adapter verifies all four recovery-time checksums, unique exact brief-title candidate selection, report-to-pack source ID/URL agreement, per-claim source URL agreement, exact claim text in the article, and a unique canonical passage suggestion from that claim's own source.
- Claims absent from the final article are blocked; unresolved/ambiguous passage mappings remain unknown. The 10x Research sample must stay at 2 eligible claims, 3 blocked article/report mismatches, and 2 claims with unresolved passages.
- It emits validated inputs only: no replacement text, no article write, no semantic-support upgrade, human approval required, automatic application false.
- Added `scripts/test-boat-recovered-proposal-input.mjs` with synthetic integrity regressions and all three real archived samples. Offline CI [run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288) passed 64/64, 0 failed, 0 skipped; latest docs/head recheck [run 38117465699](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117465699) also passed 64/64.
- Important limitation remains: recovery-time hashes were not recorded by the original workflow and do not retroactively establish generation-time integrity.
- Do not merge PR #35 or run provider/publishing workflows. Next: inspect the exact CI result and fix only reproducible adapter/test defects.



## Proposal-input schema and CLI validation

- Added `BOAT/schemas/recovered-proposal-input.schema.json` to formalize the manifest contract, including review-only constants and the explicit recovery-time-hash limitation.
- Extended `scripts/test-boat-recovered-proposal-input.mjs` with schema-contract assertions and CLI boundary tests: successful separate output, refusal to overwrite existing output, unchanged article bytes, and incomplete-argument rejection.
- Branch-head CI [run 38118585771](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118585771) passed **67/67**, 0 failed, 0 skipped. Job log explicitly confirms both CLI tests and the schema contract test passed.
- Actual archived eligibility remains 12/15, 12/18, and 2/7; the last sample's eligible set is the intersection of article-text presence and unique passage mapping, not either count alone.
- Next safe step: add a read-only report summarizing per-claim eligibility and reasons across the three runs, then review its output. Keep PR draft/unmerged and do not run publishing/provider calls.



## Read-only proposal eligibility report

- Added `scripts/boat-recovered-proposal-review-report.mjs`, which reads the three checked-in recovered article/report/brief/pack bundles and prints a per-run, per-claim JSON eligibility report to stdout. It does not write files.
- The report carries each claim's status, source ID, canonical passage ID if uniquely mapped, and reason codes. It explicitly labels semantic support as unverified and hashes as recovery-time only.
- Added integration assertions for all 40 archived claims: expected totals are **26 eligible, 3 blocked, 11 unknown** across the three samples; per-run eligible counts are 12, 12, and 2. This is eligibility for a later human-authored proposal only, not a claim-truth result.
- New report/tests and workflow path filters are committed on the draft branch. CI result is pending inspection; do not treat it as passing until logs confirm.
- No publishing, providers, article edits, or merge. Next: inspect branch-head CI, correct any failing assertions, then record the verified report counts.



## Read-only proposal eligibility report — verified

- Added scripts/boat-recovered-proposal-review-report.mjs; it prints the archived-run eligibility report to stdout and does not write artifacts.
- Per-claim report assertions and direct CLI invocation now pass. Branch-head CI [run 38118989732](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118989732): **69/69 passed**, 0 failed, 0 skipped; the job log confirms both report tests passed.
- Verified totals: **40 claims, 26 eligible, 3 blocked, 11 unknown**. Eligible counts per run: **12/15, 12/18, 2/7**. Eligibility means exact article text + matching source lineage + unique same-source passage mapping only.
- Earlier report run [38118890184](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118890184) exposed a missing pathToFileURL import; fixed and recorded in L-016. The corrected suite is green.
- Next: add a formal JSON Schema and schema-contract test for the report envelope so downstream tools can consume it safely. Keep the PR draft/unmerged; no provider or publishing runs.



## Eligibility report schema

- Added BOAT/schemas/recovered-proposal-eligibility-report.schema.json for the stdout report envelope, summary counts, per-run records, and per-claim reason codes.
- Schema-contract tests explicitly lock recovery-time-only hashes, semanticSupport=not_verified, approvalRequired=true, and automaticApplication=false.
- CI for the schema addition is pending inspection. Next: verify the full offline suite and, if green, record the new total. No production changes.



## Eligibility report schema — verified

- Report schema and schema-contract assertions passed in branch-head CI [run 38119136348](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119136348): **70/70 passed**, 0 failed, 0 skipped.
- The suite confirms the report JSON contract includes per-claim statuses/reason codes and retains recovery-time-only hashes, human approval required, automatic application false, and semantic support not verified.
- Current validated baseline: 40 archived claims, 26 eligible for a later human-reviewed proposal, 3 blocked, 11 unknown. No factual-support upgrade is implied.
- Next safe task: add cross-checks ensuring summary counts always equal the sum of per-run counts and per-claim statuses, then rerun offline CI. PR remains draft/unmerged.



## Count reconciliation — verified

- Report generation now derives counts from individual claim statuses, cross-checks each run against the proposal-input adapter counts, and cross-checks aggregate counts against the per-run totals. Any discrepancy throws and the CLI fails closed.
- Report schema now requires countsReconciled=true at summary and run levels.
- Branch-head CI [run 38119336899](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119336899) passed **70/70**, 0 failed, 0 skipped, including the schema, CLI, per-claim, and archived-run tests.
- Current totals remain 40 claims, 26 eligible, 3 blocked, 11 unknown; per-run eligible 12, 12, 2.
- Next safe step: audit whether the proposal engine can consume eligible inputs without treating recovery-time hashes as original lineage. Do not connect or invoke it until that boundary is proven by tests; no publishing/provider runs.



## Proposal-engine handoff boundary

- Inspected the existing factual proposal engine: it requires exact artifact hashes in run metadata and a workflow run ID. Recovered-run hashes were computed during this audit and cannot safely be substituted for original generation-time metadata.
- Therefore, the recovered proposal-input adapter now emits an explicit proposalEngineHandoff object with status=blocked and allowed=false. The eligibility report surfaces the same blocked handoff flag at summary and per-run levels.
- Updated both JSON schemas and tests to lock this boundary. CI for this change is pending inspection.
- This intentionally prevents eligible traceability inputs from being passed directly into the existing factual repair proposal engine with fabricated lineage. No repair text is generated and no article is edited.



## Proposal-engine handoff boundary — verified

- The adapter and report now explicitly prohibit direct handoff to the existing factual proposal engine because the recovered artifacts lack original generation-time hashes in run metadata.
- CI [run 38119611350](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119611350) passed **70/70**, 0 failed, 0 skipped, including adapter/schema/report regressions.
- This avoids laundering recovery-time hashes into the existing same-run lineage contract. No factual proposal engine is invoked and no replacement text is generated.
- Next: keep the handoff blocked unless original workflow-bound hashes can be recovered from trustworthy provenance. No provider calls, publishing, or merge.



## Original metadata hash audit — verified

- Inspected generated and claim-blocked metadata for all three recovered attempts (6 files). All 3 pairs agree on workflowRun/workflowSha; **0/6** contain the required article/report/evidence-pack SHA-256 fields.
- This confirms the handoff blocker is based on actual saved metadata, not a theoretical concern. Recovery-time checksums cannot be treated as original hashes.
- Latest docs/head CI [run 38119678517](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119678517) passed **70/70**, 0 failed, 0 skipped.
- No production code, provider, publishing, or article changes. Continue blocking proposal-engine handoff until original hash provenance is recovered from a trustworthy record.



## Workflow-recorded quarantine hashes — validated

- Updated the claim-verification quarantine step in .github/workflows/publish.yml to copy the canonical authoritative evidence pack into the quarantine bundle and record SHA-256 fields for the exact quarantined article, claim report, and evidence pack alongside the same workflowRun/workflowSha.
- The adapter now accepts handoff only when the run metadata bytes match the recovery audit, the metadata says hashes were recorded by the workflow, all three artifact hashes match the exact supplied bytes, and run ID/workflow SHA match.
- Synthetic tests prove a valid same-run metadata bundle can pass the handoff boundary and tampering blocks it. Existing archived runs remain blocked because their original metadata lacks the fields.
- CI [run 38120312395](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120312395) passed **73/73**, 0 failed, 0 skipped, including workflow-contract tests.
- No publishing workflow was run. The workflow edit is on PR #35 only; main remains untouched.



## Pack-shape handoff guard — verified

- The factual proposal engine currently looks for root-level evidencePack.sources. The recovered authoritative pack envelope stores sources under a uniquely selected candidates[] entry. Even when hashes exist, those two shapes must not be treated as interchangeable.
- The adapter's handoff check now requires both original workflow-recorded hash metadata and a pack shape the proposal engine can consume without changing the hashed bytes. Current candidate-envelope packs remain blocked.
- Synthetic tests cover valid matching metadata, metadata tampering, and the pack compatibility guard. Latest branch-head CI [run 38120500152](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120500152) passed **73/73**, 0 failed, 0 skipped.
- Next: teach the factual proposal engine to resolve one candidate only when proposal candidate title/link exactly match the recovered audit, with regression tests for missing/ambiguous candidate identity. Until then, keep direct handoff blocked.



## Proposal-engine handoff gate — verified

- Hardened the recovered proposal-input adapter so the factual proposal engine is not eligible for handoff just because recovery-time hashes exist. Handoff requires original generation-time hashes, an explicit original-workflow hash marker, matching artifact bytes, and matching run/workflow-SHA metadata.
- Added tests proving a properly hash-bound same-run fixture can pass the handoff predicate, while tampered metadata fails closed.
- Latest branch-head offline CI [run 38120577418](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120577418): **73/73 passed**, 0 failed, 0 skipped.
- The three archived examples still cannot be handed off to the factual proposal engine because original generation-time hashes are absent. The 26 “eligible” claims are only eligible for proposal-input preparation; semantic support remains unverified.
- Next: test a complete proposal-engine handoff using a controlled synthetic bundle, without generating factual replacement text or changing article artifacts. Keep PR draft/unmerged; no publishing/provider calls.



## Candidate-envelope proposal handoff — verified

- Updated the factual proposal engine to accept either the legacy flat sources array or the canonical candidates[] envelope. For candidate envelopes, it requires exact candidateTitle + candidateLink and exactly one matching candidate; missing or duplicate identity blocks the proposal.
- Adapter handoff compatibility now recognizes the canonical candidate envelope only when the recovery audit's selected title/link and authoritative source mapping agree. Candidate title/link are exposed in the input manifest for the human-authored proposal.
- Added end-to-end offline test: valid workflow-bound metadata + exact candidate envelope -> proposal engine returns review_required; semanticSupport stays not_verified, approvalRequired=true, automaticApplication=false, and article bytes remain untouched.
- CI [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568) passed **77/77**, 0 failed, 0 skipped. Missing and ambiguous candidate identity tests also pass.
- Existing archived runs remain blocked for direct handoff because their metadata lacks the required original workflow-recorded hashes. No publishing/provider workflow was run.


## Deterministic review-set golden fixtures — implementation in progress (2026-10-11)

- Added synthetic fixtures for duplicate review IDs, conflicting independent reviewers, same-reviewer disagreement/repeats, and an invalid record mixed with one valid review.
- Added golden report tests for each case and permutation checks. The canonical comparison sorts only order-insensitive findings/verdict summaries; the report's `records` array must retain the exact caller/source order, every dissenting verdict remains visible, and no aggregate verdict or automatic adjudication is permitted.
- Added both fixture and golden-test paths to the offline workflow filters. CI result is pending; inspect failures before calling this complete.
- Constraints unchanged: diagnostic-only; no provider calls, publishing runs, main-branch edits, or PR merge. PR #35 stays draft/unmerged.

**Next step after CI:** fix any fixture/test issues without weakening contracts, rerun the branch-head offline suite, record the verified run, and then inspect PR status.


**CI correction note:** first run [38122385425](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122385425) ran 113 tests: 111 passed, 2 failed. One golden expectation underestimated validator error count for the deliberately unsafe fixture; the permutation test incorrectly compared source-order records as if they should be sorted. Updated the expected error count and now compare order-insensitive summaries separately while explicitly asserting the records array preserves each supplied order. Re-run branch-head CI before marking this step verified.


## Deterministic review-set golden fixtures — verified (2026-10-11)

- Branch code/test-fix CI [run 38122442789](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122442789) passed **113/113**, 0 failed, 0 skipped.
- Golden cases passed for duplicate IDs, independent reviewer disagreement, same-reviewer repeat/disagreement, and invalid records. Permutation tests passed while separately confirming input/source record order is preserved and dissenting verdicts remain visible.
- First-run harness defects and corrections are recorded above. This validates the offline audit contract only; it does not establish semantic truth, approve publication, or change runtime behavior.
- **Next:** inspect the final PR diff and check branch-head CI after the documentation updates. Keep PR #35 draft/unmerged; do not touch `main`, call providers, or run publishing.


**Branch-head recheck after fixture cleanup:** [run 38122539254](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122539254) passed **113/113**, 0 failed, 0 skipped on head `9153fc66d0e37f31f0320a4ac3848670ee745f76`. The fixture is now minimal; all four golden scenarios and permutation/dissent checks pass. Final next action remains PR diff review and choosing the next safe offline BOAT task.


## Stable review-set report ordering — verified (2026-10-11)

- Updated the review-set auditor to sort reviewer iteration, verdict arrays, subject groups by opaque subject fingerprint, and findings by stable content while excluding input-relative `recordIndices` from sort keys.
- The original `records` array remains in caller order and indices still refer to that order. No source records are dropped or rewritten; all dissent remains visible; aggregate verdict stays null and automatic adjudication stays false.
- Added a multi-subject permutation test for stable findings/group order and input-relative record indices.
- CI [run 38122708610](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122708610) passed **114/114**, 0 failed, 0 skipped.
- **Next:** add a formal JSON Schema/contract test for the review-set audit report envelope, including findings, subject groups, indices, and no-winner invariants. Keep PR #35 draft/unmerged; no provider/publishing runs and no `main` changes.


## Review-set report schema — verified

- Added a JSON Schema for the review-set audit report and contract tests covering its envelope, indices, dissent, and no-winner fields.
- Offline CI run 38122850780 passed 120/120 tests with zero failures or skips.
- Next: inspect the PR diff and reconcile the final project records. Keep PR #35 draft/unmerged; do not touch main or run provider/publishing workflows.


## Structural report validation — verified (2026-10-11)

- Added executable structural checks in `scripts/test-boat-semantic-support-review-set-report-schema.mjs` for the checked-in report schema keywords: types, required fields, enums/constants, additional properties, minimums, patterns, and array items.
- Validated generated audit reports for golden review sets and invalid input; negative tests reject malformed fingerprints, unknown finding types, extra properties, and unsafe winner fields. Malformed source identity types are represented safely as null in report identity fields while the record remains ineligible and validation errors remain visible.
- Branch-head CI [run 38123099695](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123099695) passed **123/123**, 0 failed, 0 skipped.
- **Next:** review the entire PR diff for scope and schema/output compatibility, then record a final branch-head verification. Keep PR #35 draft/unmerged; do not touch `main`, call providers, or run publishing.


## Structural report validation — verified

- Added executable validation of generated audit reports against the checked-in schema, including invalid input.
- Negative tests reject bad fingerprints, unknown finding types, extra properties, and unsafe winner fields. Malformed identity values are normalized in typed report fields while errors remain visible.
- CI run 38123099695 passed 123/123 tests, 0 failures, 0 skipped.
- Next: review the full PR diff and verify branch-head CI after documentation. PR #35 remains draft and unmerged.


## Safety-sensitive PR review — handoff status guard added (2026-10-11)

- Reviewed the claim-verification quarantine diff, recovered proposal-input handoff predicate, factual proposal boundary, semantic review schema/validator, review-set audit contract, and offline workflow scope.
- Confirmed the publishing workflow diff adds hashes only to the claim-verification-blocked quarantine metadata; it continues removing the blocked article from the publication set and does not turn the claim gate into a pass. No publishing/provider workflow was run.
- Found a defense-in-depth gap: the recovered proposal-input adapter verified metadata bytes, run/SHA, hash marker, exact artifact hashes, and pack compatibility, but did not explicitly require metadata status `claim-verification-blocked` before allowing proposal-engine handoff.
- Fixed `scripts/boat-recovered-proposal-input.mjs` to require that exact status and added a regression where all hashes and identities match but status is `generated-pending-verification`; handoff must remain blocked.
- Regression CI run [38123444976](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123444976) was queued on head `e5f3a61a4c12c67af5a2abd239645bf050330544` at the time of this record; inspect its final conclusion before marking the fix verified.
- Review status: this is a defensive hardening, not evidence of an exploitable production bypass under the current workflow. No other gate bypass was identified in the inspected paths. Full PR review remains in progress.
- Keep PR #35 draft/unmerged; do not touch `main`, run paid providers, or run publishing workflows.


**Verification update:** Branch-head offline CI [run 38123484401](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123484401) passed **124/124**, 0 failed, 0 skipped on head `48dd22c7a2e7b00e2ddbb52f98b5294112658db6`. The new non-blocked-metadata regression passed. Continue the remaining full-diff review; keep PR #35 draft/unmerged and production workflows untouched.


## Second safety-review pass — recovery state and source URI hardening (2026-10-11)

- Reviewed the artifact-recovery audit, recovered proposal adapter, factual-proposal boundary, semantic-review validator, review-set report logic, CLI output boundaries, and publishing quarantine path.
- Found and fixed a recovery-state validation gap: the recovery audit now blocks unless the blocked metadata status is exactly `claim-verification-blocked` and generated-attempt metadata status is exactly `generated-pending-verification`. Added separate negative tests for both mismatches. CI [run 38123747483](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123747483) passed **126/126**, 0 failures, 0 skips.
- Found and fixed a source-URL scheme validation gap: the semantic-review validator previously accepted any absolute URI scheme. Review source URLs are now restricted to HTTP/HTTPS; tests reject `javascript:`, `file:`, and `ftp:`. CI [run 38123791630](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123791630) passed **127/127**, 0 failures, 0 skips.
- These are input-validation/defense-in-depth fixes. They do not establish semantic truth, do not change publication eligibility, and do not bypass or weaken any existing gate.
- Remaining review focus: verify final branch-head CI after records are updated and complete a final diff/status check. PR #35 remains draft/unmerged; no providers or publishing workflows run.

## Offline CI path-filter review — 2026-10-11

- Found one test-trigger omission: `scripts/test-boat-semantic-support-review.mjs` was executed by the broad Node test command but absent from the workflow `pull_request.paths` allowlist. An isolated future change to that test could therefore fail to trigger the offline suite.
- Added the missing path entry in `.github/workflows/boat-offline-tests.yml`. This changes test triggering only; no runtime/publishing behavior or gate changed.
- Next: verify CI on the final docs/head commit, then finish reviewing the remaining diff and confirm PR #35 is still draft/unmerged. No provider or publishing workflow runs.

## Final diff-review checkpoint — 2026-10-11

- Added the missing semantic-review schema test path to the offline workflow trigger list. Cross-check now shows every `scripts/test-boat-*.mjs` test changed in this PR has an explicit path trigger.
- Final verified offline run [38124374037](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38124374037) passed **127/127**, 0 failures, 0 skipped, on the then-current branch head; log confirms the schema/CLI/review-set tests and HTTP(S)-only URI regression passed.
- Reviewed the publishing quarantine diff: it copies the evidence pack when present, hashes the exact quarantined article/report/pack bytes, records `hashesRecordedInWorkflow=true` only when all three hashes exist, and still removes the blocked article from the publication set. No production workflow was executed.
- PR #35 remains open/draft/unmerged; `main` untouched. Remaining: final reviewer decision and any further requested review; do not merge by default.

## North-star realignment — next step

The goal is a usable Smart BOAT, not an ever-growing set of offline validators. Existing audit/lineage modules are enabling components only.

**Immediate next action:** audit the existing Control Center route, its data inputs, current Supervisor/Self-Learning outputs, and available safe backend options. Produce a concrete vertical-slice implementation plan for a real BOAT task/chat surface: user instruction → read-only task execution → published-article findings → evidence-linked explanation → saved task/audit history. Then implement that slice with tests on this branch. Include a secure server-side boundary; never put privileged tokens in static browser code.

**User-visible product goals to preserve:** audit all published articles, check claims/evidence/sources and freshness, research public web sources, compare external articles for editorial improvements, propose fixes with diffs/reasons/risks, request explicit permission for consequential changes, execute approved changes in isolation through existing gates, and learn from verified outcomes.

**Do not treat as complete:** schemas, validators, archive eligibility counts, or passing offline tests do not deliver chat, live web research, full published-catalogue audit, approval UI, controlled execution, or learning promotion. Keep records honest about this distinction. PR #35 stays draft/unmerged; no provider or publishing workflow calls; do not touch `main`.


## Product vertical slice — published catalogue inventory (2026-10-11)

**Implemented on the BOAT branch; CI verification pending.** The Control Center now imports a read-only structural inventory for Markdown files under `content/articles`. It reports per-file word count, HTTP(S) link count, presence of a Sources/References heading, empty headings, and repeated paragraphs. Results are sorted by structural-flag count and the UI displays up to 20 rows.

**Important boundary:** this is a build-time static snapshot because Next.js is configured with `output: 'export'`. It is not live chat, live web research, claim-to-passage verification, freshness verification, or a privileged action backend. Missing article directory returns an empty inventory and the UI explicitly labels it unknown/failure rather than a clean pass. No article is changed and no provider or publishing workflow is invoked.

The new helper has fixture tests for clean and flagged articles, non-Markdown exclusion, and missing-directory behavior. Next after CI: review the actual inventory generated by a safe site build, then implement the next read-only slice for article-to-claim/evidence-pack coverage with explicit unknown/blocked states. Do not fake live chat until a secure backend is chosen. PR #35 stays draft/unmerged; main untouched.


**Verification update — 2026-10-11:** the new catalogue helper fixture test passed in BOAT Offline Tests run [38125272757](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125272757). The complete BOAT suite passed **128/128**, and the Control Center deterministic suite passed **33/33**. The dedicated Control Center QA run [38125272747](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125272747) also passed, including the production Next.js static build. Build logs include existing webpack cache/CSS warnings but no build failure. This verifies the static page compiles; it does not verify factual claims or create a live backend.


**Build-fix note (2026-10-11):** the first CI build after switching the scanner to the canonical `lib/articles.ts` index caught a stale table key (`article.file` no longer exists). Fixed the table key/display to use `article.slug`, and aligned the deterministic test to the canonical-index input. The follow-up Control Center QA run is pending; do not count the build as green until its result is inspected.


**Verification complete (2026-10-11):** follow-up run [38125516855](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125516855) passed **128/128 BOAT tests**, 0 failed; Control Center checks passed **33/33**. Run [38125516938](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125516938) passed the Control Center QA production build (Next.js compiled successfully). The earlier type failure was caught, fixed, and verified by these green follow-up runs.


## Published claim-report coverage slice — verified 2026-10-11

The Control Center now checks every canonical published article against archived `data/article-attempts/*/claim-verification.json` records using the report's canonical `articlePath`. It shows archive report coverage, historical PASS/block/conflicting outcomes, archived claim-count signals, and whether an evidence-pack file was present. Conflicting history is retained rather than selecting a preferred report.

**Critical limit:** this is historical coverage matched by path only. The published article index does not yet carry the exact published article SHA-256 plus paired claim-report/evidence-pack hashes, so a historical PASS is not represented as current verification. Missing reports are UNKNOWN, never PASS. This is a useful visibility bridge, not the final claim-level audit engine.

Verification: [BOAT Offline Tests run 38125733728](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125733728) passed **128/128** tests; Control Center contract suite passed **37/37**. [Control Center QA run 38125733739](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125733739) passed the production static build.

**Next implementation:** create a lineage manifest during publishing that binds the exact published article bytes to the exact claim report and evidence pack, then use that immutable binding for a real current-version audit. Do not infer exactness from title/path. Keep the static Control Center honest; live chat/actions still require a separately deployed authenticated backend.


## Published lineage manifest builder — implementation in progress (2026-10-11)

- Added `scripts/boat-published-lineage-manifest.mjs` as a deterministic, offline helper to bind exact article, claim-report, evidence-pack, article-brief, and current-run-marker bytes to a workflow run/SHA.
- The helper fails closed unless the current-run marker says an article was generated by the same run, the claim report is PASS for that exact article path with claim records, and exactly one evidence-pack candidate matches the current brief title and has sources. It rejects unsafe paths, duplicate article paths, malformed timestamps, and missing inputs.
- Added synthetic contract tests in `scripts/test-boat-published-lineage-manifest.mjs`. Added both paths to the BOAT offline workflow filter so isolated changes trigger the offline suite.
- **Offline verification complete:** do not call this production-integrated or current published-article verification. The helper is not yet wired into `publish.yml`; no publishing/provider workflow was run, no article was edited, and `main` remains untouched.
- Next: inspect branch-head offline CI. If green, review manifest contract against the actual generated marker/report/pack shapes, then integrate only after proving same-run inputs and preserving the existing publication gates.


## 2026-10-11 — Lineage schema contract correction (offline verification pending)

- Read the actual `scripts/generate-article-adaptive.mjs`, `scripts/verify-article-claims-v2.mjs`, `scripts/verify-article-claims-smart.mjs`, `scripts/pre-writer-pipeline.mjs`, and `scripts/authoritative-evidence-pack.mjs` data contracts.
- Confirmed current-run marker fields include `version`, `runId`, `generated`, `articlePath`, `briefTitle`, and `updatedAt` (native fallback may also include `producer`). Claim report uses `pass`, `articlePath`, `articleTitle`, `claimCount`, `claims`, and `generatedAt`. The evidence artifact is an envelope `{version:1,status:'authoritative',candidates:[canonicalPack...]}`; each canonical pack must pass `validateAuthoritativeEvidencePack`.
- Found a contract gap in the first manifest implementation: it looked for candidate entries but did not enforce the real envelope schema, validate the canonical candidate pack, cross-check marker `briefTitle`, or bind the report's `articleTitle` and `claimCount`. Corrected the builder and synthetic tests to validate these contracts and to reject duplicate/ambiguous candidates and invalid canonical packs.
- No production publishing workflow, provider call, article edit, or `main` change was made. CI for the schema correction is pending; do not mark the correction verified until the new branch-head run passes.
- Next: inspect the offline test and Control Center QA results for the new head. If green, design a separate, testable publish-time integration that captures the lineage record before run-scoped files are removed, without weakening any existing gate.


## 2026-10-11 — Non-blocking publish-time lineage capture added (CI pending)

- Added `scripts/write-boat-published-lineage-manifest.mjs`. It reads exact current-run marker/article/claim-report/evidence-pack/brief bytes, verifies the current run/SHA and all schema/identity contracts through the manifest builder, then writes one immutable `data/published-lineage/manifest-<runId>.json` record. Existing output cannot be overwritten.
- Expected no-article runs are a clean no-op and write no manifest. Missing/mismatched evidence or a non-PASS report fails closed (no PASS manifest).
- Wired the writer into `.github/workflows/publish.yml` after SEO validation and before site build with `continue-on-error: true`; it is diagnostic only and cannot weaken or replace existing publication gates. A manifest is persisted by the existing output commit only if the subsequent build/commit path succeeds.
- Added `scripts/test-boat-published-lineage-cli.mjs` for successful capture, no-overwrite, no-article no-op, and non-PASS rejection; added writer/test/validator paths to BOAT offline CI filters.
- The schema-correction run exposed one incorrect test expectation (the helper reported the more specific “has no sources” failure); corrected the assertion. The latest branch-head offline/Control Center CI is pending; do not call the publish-time integration verified until it finishes.
- No publishing workflow was executed, no provider call was made, no article was edited, `main` remains untouched, and PR #35 remains draft/unmerged.
- Next: inspect branch-head BOAT offline tests and Control Center build. If both pass, review the exact diff and verify the writer remains non-blocking and the manifest output path is included by the existing `git add data` commit path.


## 2026-10-11 — Control Center lineage type declaration fix (CI pending)

- Current-byte lineage audit and UI were added on the BOAT branch. The first production build failed because the new export was missing from `scripts/boat-published-catalogue-audit.d.mts` at the failing commit; the JavaScript implementation existed, but TypeScript resolves the paired declaration file.
- Added the missing exported type/function declaration. Earlier parser/guard issues were also corrected: manifest filenames and article paths now use straightforward safe parsing; offline coverage tests passed 130/130 at run 38127571372 before the type-declaration fix.
- New branch-head CI is running at commit `8fc20d44eccb269ef530e7f57b939cfa171a6686`: BOAT Offline Tests run 38127662468 and Control Center QA run 38127662461. Do not mark the integration complete until both finish successfully, especially the production build.
- No main-branch changes, merge, publishing workflow dispatch, article mutation, or provider calls were made.
- Next: inspect both branch-head CI results. If the production build passes, review the full PR diff and confirm publish-time manifest persistence and Control Center states. Then continue toward the original BOAT target: a read-only audit of every published article, including evidence/claim/source lineage, with UNKNOWN preserved wherever proof is absent.


## Follow-up verification — 2026-10-11 (lineage integration)
- Branch-head CI rechecked: BOAT Offline Tests [38127688568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38127688568) PASS; Control Center QA and production build [38127688585](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38127688585) PASS. Earlier QA run [38127662461](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38127662461) also passed.
- Reviewed PR #35 metadata and compare summary. PR remains open/draft/unmerged. Compare against main reports 5 commits behind and 448 commits ahead (the comparison includes the branch's existing history; do not interpret that count as 448 new BOAT files). Do not merge or rebase blindly; review base divergence separately before any merge decision.
- Reviewed .github/workflows/publish.yml: lineage capture runs after SEO validation and before site build; it is explicitly diagnostic/non-blocking. The later output commit stages data, so a successfully written data/published-lineage/manifest-<runId>.json is eligible for persistence if the publishing job reaches and completes its output-commit step. The workflow has not been dispatched for this feature, so actual production manifest creation/persistence remains unverified.
- Important safety boundary: this manifest proves exact-byte lineage and a recorded claim-verifier PASS for that article version; it does not freshly fact-check claims or verify source freshness. The Control Center display is read-only. No article was changed, no provider/publishing workflow was run, and main remains untouched.
- Next: add/verify a synthetic workflow-level persistence contract (without dispatching production publishing), inspect base-branch divergence and the complete PR file-level diff, and keep the PR draft until those checks are complete.


## Verified update — 2026-10-11 (lineage workflow contract + divergence review)
- Latest branch-head BOAT Offline Tests [38128016828](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128016828) **PASS** and Control Center QA/production build [38128016780](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128016780) **PASS**, both at `932d5878a8cd4cd4025ccc89954a716d28af020f`.
- Synthetic workflow contract checks capture-before-build ordering, non-blocking behavior, run/SHA environment, immutable run-scoped manifest naming, no-article no-op, fail-closed handling, staging of `data/`, and the existing output transfer/push path. This verifies the static contract; it is not a production execution proof.
- Reviewed actual publish workflow: `generate-article-adaptive.mjs` writes the current-run marker, the capture step follows the existing SEO gate and precedes build, and output transfer includes `data/`. Real production manifest persistence remains unverified because the production publishing workflow was not dispatched.
- PR #35 remains open/draft/unmerged; `main` remains untouched by this work. The 5 main-only commits since the merge base are routine generated-intelligence data refreshes (TrendForge V2 intelligence, performance, experimentation, self-learning, and memory); no blind rebase/merge performed. The 454 ahead count is historical branch ancestry, not 454 new BOAT changes.
- Next: strengthen the offline contract around the exact `data/published-lineage/manifest-<runId>.json` path and output-transfer eligibility, then perform a final changed-file and conflict review. Do not dispatch production publishing or invoke paid providers.


## Verification update — 2026-10-11 (path-specific contract hardened)
- Strengthened the synthetic workflow test to assert the exact `data/published-lineage/` output directory, run-scoped `manifest-<runId>.json` filename, and inclusion of `data/` in the existing generated-output transfer allowlist.
- The first version of these extra assertions exposed malformed regex escaping and failed CI (run 38128194347); the test source was corrected, not the production workflow. The corrected branch-head BOAT Offline Tests [38128203466](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128203466) and Control Center QA/production build [38128203447](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128203447) both **PASS** at `5e24de25e22ca77a1e399b985d2c291fbeffb2a8`.
- Next: finish a changed-file intersection check against main's five generated-intelligence refresh commits, then review final PR status. Do not merge/rebase blindly or dispatch the production publisher.


## Next-step delivery — 2026-10-11 (real catalogue audit CLI)
- Added `scripts/boat-audit-published-catalogue.mjs`, an offline, read-only CLI that audits the actual canonical `lib/articles.ts` catalogue and emits JSON inventory, per-article structural findings, finding counts, and duplicate slugs. It does not edit articles or run provider calls.
- Added `scripts/test-boat-audit-published-catalogue.mjs` and wired both files into BOAT Offline Tests path filters. Test asserts report inventory matches the actual catalogue, counts are internally consistent, and semantic/source-freshness limitations remain explicit.
- Initial run caught a test integration bug: CLI emitted a literal backslash-n after JSON. Fixed output to emit an actual newline. Latest offline run [38128438403](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128438403) **PASS** at `aca78e9aa46f61e0e570241b1429799b8452abd1`.
- Control Center QA / production build [38128438407](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128438407) was still running at last poll. Recheck before claiming full green.
- Next: use this read-only inventory as the base for per-article issue review and safe repair proposals. Do not make automatic article edits, dispatch production publishing, or call paid providers.
## Next implementation — combined published review queue (2026-10-11)

- Added `scripts/boat-published-review-queue.mjs` and `scripts/boat-audit-published-review-queue.mjs` to combine the canonical published catalogue's structural findings, historical claim-report coverage, and exact-byte lineage coverage into one per-article read-only triage report.
- The report ranks review priority, preserves `unknown`, stale lineage, historical blocks, conflicting outcomes, and duplicate-slug ambiguity, and suggests next human review actions. Every article remains `needs-human-review`; no result is a factual PASS, and the queue cannot edit or publish articles.
- Added synthetic triage assertions plus an integration test that runs the CLI over the real `lib/articles.ts` catalogue; added explicit offline workflow path filters for the module, CLI, and test.
- **Verification pending:** inspect branch-head BOAT Offline Tests and Control Center QA before marking this step complete. No production publishing, provider calls, article edits, merge, or `main` changes.

## Claim-level published audit — implementation in progress (2026-10-11)

- Added `scripts/boat-published-claim-audit.mjs` and `scripts/boat-audit-published-claims.mjs` to scan saved `claim-verification.json` reports under `data/article-attempts` and map them to the canonical published catalogue by exact canonical `articlePath` slug.
- Each archived claim row preserves verifier status/classification, source ID/title/URL/role, passage IDs, a capped evidence excerpt, context completeness, current-article exact-text diagnostic, run/SHA metadata when available, and the original report outcome. All historical attempts are retained; conflicting PASS/block history is not collapsed into a latest winner.
- Missing reports remain UNKNOWN. Historical PASS is not current verification; exact-text non-match is only a version/segmentation signal. This step does not fetch sources, independently re-run the verifier, edit articles, generate repair text, or publish.
- Added synthetic regression tests and a real-catalogue CLI integration test; added explicit offline workflow path filters. **Branch-head CI verification is pending**; inspect both BOAT Offline Tests and Control Center QA before marking verified.

### Claim-audit data-source correction — 2026-10-11

- First CI run exposed a test-fixture gap: the `gamma` article had no current Markdown file, so the audit correctly returned `unknown-current-article-missing` rather than `unknown-no-archived-claim-report`. Added the missing fixture file; no production audit logic was changed for that test failure.
- Inspecting the real repository root revealed `data/claim-verification.json` is a current workflow snapshot for one published slug (`amazon-eyes-8-b-nvidia-chip-financing-to-lighten-ai-capital-load`), while archived attempt folders contain no matching claim reports for the current 48-slug catalogue at this scan. Updated the CLI to include the root report explicitly as `root-workflow-snapshot`, but not to imply exact-byte lineage because no root metadata/hash binding is available.
- New CI verification is pending; report all counts from the latest branch-head logs only.

## Next execution — root claim/evidence-pack lineage audit (2026-10-11)

**Implemented; latest-head CI pending:** added `scripts/boat-root-claim-lineage-audit.mjs` and `scripts/test-boat-root-claim-lineage-audit.mjs`, wired into the offline workflow. The audit understands the real canonical envelope `{version,status,candidates}`, matches the candidate by the current article brief title, resolves claim source IDs/URLs and normalized passage/fact anchors, and keeps semantic support explicitly `not_assessed`.

**Corrected repository finding:** the canonical pack is valid JSON with 24 candidates, not empty. The GitHub file helper returned an empty content field for this large file, while the raw contents response returned the ~3.46 MB JSON. Exactly one candidate matches the root brief title and contains two sources. The root pack and archived attempt pack have the same Git blob SHA (`23b5b53069351539853d02be1a1f4e08c44b017a`); archived metadata associates the same article path and pack with workflow run `38106429274`. The claim report itself has no saved report hash/run ID in that archive, so report-to-run binding remains UNKNOWN. Structural ID matches do not establish semantic support.

**Next:** validate the new offline test on latest HEAD and inspect its live output. Then add report hash/run ID to the future workflow manifest/attempt archive. Do not run production publishing, call paid providers, repair the article, or write to `main`.

**Validation correction (2026-10-11):** first offline run of the new CLI test failed because the CLI appended a literal backslash-n sequence rather than a real newline, making captured stdout invalid JSON. Fixed in commit `b70032893c8f9108f8d523e44f917ba8f1be2b37`. The failed run was against an earlier commit, before this correction. Verify the next offline run on the latest branch head before proceeding.

## Verification checkpoint — root lineage audit (2026-10-11)

Offline regression run [38129695590](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38129695590) passed **135/135 tests** at commit `e1146ef18c67be057f4d73893df395b9fdc5fedf`; its log includes `BOAT root claim/evidence lineage audit: PASS`. The new audit intentionally keeps status `unknown-pack-binding` because this root snapshot has no metadata input to prove exact report/evidence-pack pairing. Local source/passage ID matches are labelled diagnostics only; factual support remains `not_assessed`. The latest follow-up only changes the test's success-message wording (`9b0fd123c11811aceb5b9017f2ea3239dd99b3ef`), so verify its run before declaring the current HEAD fully green.

**Next action:** close the historical report/run binding gap, not a pack-storage defect. The large canonical pack exists and is valid JSON; the GitHub file-content wrapper omitted its oversized body. The root pack and archived attempt copy share blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a` at output commit `f91f00e722b2946bb876c574363177000c9f2e4d`. The current branch's read-only audit step now reports the exact missing piece: no lineage manifest binds the claim-report hash to run `38106429274`. Keep PR #35 draft/unmerged and leave `main` untouched.

## Root lineage audit hardening — 2026-10-11

**Correction to prior diagnosis:** the evidence pack is not zero bytes. Direct Git blob retrieval returned a 3,462,484-character JSON blob with 24 candidates; the root and archived attempt copy share blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a`. One candidate exactly matches the archived brief title, and its S1/S2 URLs match the claim report. The test still uses an isolated `BOAT_AUDIT_ROOT` fixture because parallel tests can mutate shared artifacts. The actual historical gap is missing exact claim-report/run binding.

The lineage parser reads the canonical envelope (`candidates[]`, `candidate.title`, `sources[]`, `evidenceBrief.relevantPassages`, and `storyFactMap.coreFacts`). Fact anchors resolve through `coreFacts`. Correction: the root pack is valid and not empty; its root/archive copies share blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a`. The remaining gap is historical report/run binding: archive metadata omits the claim-report hash and no `data/published-lineage/manifest-38106429274.json` exists. The current BOAT branch has a non-blocking capture step for future runs; validate that path offline and keep the historical report status UNKNOWN.

## Historical root lineage audit — verified 2026-10-11

Read-only audit run [38130433463](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130433463) passed **135/135 tests** and ran the live root lineage audit successfully. The root report has saved `pass: true` and 10 claims. The canonical pack is valid JSON with 24 candidates; exactly one candidate matches the article brief, with two sources. Structural audit results: 10/10 claim source IDs resolved, 10/10 source URLs match the selected candidate, 9 passage IDs resolved, 10 body-anchor references found, and 0 passage IDs unresolved. These are traceability results only; factual/semantic support remains `not_assessed`.

The audit status is **`unknown-report-run-binding`**: archived metadata and byte-identical pack copy bind the evidence pack to workflow run `38106429274`, but `data/published-lineage/manifest-38106429274.json` is absent and the archived metadata does not contain `claimReportSha256`. The historical main workflow SHA `a16223ff72c997f516f0def895962554c79946c1` predates the lineage capture step. The current BOAT branch has a non-blocking capture step for future runs. Next: verify latest-head offline and Control Center QA, then leave report/run status UNKNOWN until a real manifest exists.

## Latest verification — 2026-10-11

Latest branch head at this checkpoint: `53e856e41751c44bc3f65d59ccca7ceb781740f7`. Offline run [38130573836](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130573836) passed **136/136 tests** and ran the live root lineage audit successfully. Control Center QA run [38130573818](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130573818) passed the deterministic suite and production build. Live audit remains `unknown-report-run-binding`; pack-to-archive run binding is proven, but report-to-run binding is not. The 10 claims have 10 source IDs resolved, 10 URLs matched, 9 passage IDs resolved, and 0 unresolved passage IDs; this does not certify semantic factual support. PR #35 stays draft/open/unmerged, and no production publishing was dispatched.

## Attempt lineage binding — implementation checkpoint (2026-10-11)

**Implemented on the BOAT branch:** `scripts/boat-bind-attempt-lineage.mjs` creates an immutable `*-finalized` attempt bundle after claim verification. It stores final article bytes, the canonical evidence-pack bytes, the final `claim-verification.json`, and SHA-256 hashes plus workflow run/SHA metadata. It preserves the original pre-repair attempt, refuses to overwrite conflicting finalized bundles, and is idempotent. The publish workflow invokes it after the claim-verification gate status and before uploading attempt diagnostics; the step is diagnostic/non-blocking, so a lineage issue does not silently change publication eligibility. The root lineage audit recognizes finalized bundles and exact-hash lineage manifests.

**Verified baseline:** offline run [38130627939](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130627939) passed **136/136 tests**, including the binder regression and root audit; live root audit correctly reports `unknown-report-run-binding` for the historical run whose archive predates the new binder/manifest binding. Control Center QA run [38130627994](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130627994) had deterministic checks pass; production build was still running at the last check. A follow-up tightened binder matching to require exact workflow SHA and select one source attempt; verify latest-head CI for that change.

**Next:** verify offline and build at latest branch head, then on the next normally scheduled production run inspect whether the finalized bundle is created and the audit reaches hash-bound lineage. Do not manually dispatch production or fabricate a report/pack.

## Workflow contract test correction — 2026-10-11

A fresh offline run exposed a test-only failure in `scripts/test-boat-published-lineage-workflow.mjs`: regex literals had double-escaped whitespace/dot/slash/dollar tokens, so the test searched for literal backslashes rather than matching the workflow's `continue-on-error: true` and GitHub expressions. The production workflow was not the failure; Control Center QA and its production build passed on the same prior revisions. Corrected the test regexes and the binder-step assertion. Latest offline run `38130780216` now shows `fail 0` and the isolated root-lineage CLI fixture passes; the run was still completing cleanup at last poll. Verify final conclusion and latest-head Control Center build before moving to production artifact inspection.

## Finalized attempt lineage binding — 2026-10-11

**Implemented and offline-verified:** added `scripts/boat-bind-attempt-lineage.mjs` with regression coverage. The publish workflow now invokes it after final claim verification and before attempt-diagnostic upload. It creates an immutable `-finalized` attempt directory containing the final article bytes, canonical evidence pack, claim report, and metadata hashes (`articleSha256`, `evidencePackSha256`, `claimReportSha256`) tied to `GITHUB_RUN_ID`/`GITHUB_SHA`. Existing bundles are idempotent when identical and preserved on mismatch. The step is `continue-on-error: true`, so it does not add a new publication gate.

The root audit now recognizes this finalized bundle only when the exact report, article, and pack bytes/hashes match. Offline run [38130780216](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130780216) passed **136/136 tests**, including the binder and workflow contract; the live historical audit correctly remains `unknown-report-run-binding` because run `38106429274` predates this step and has no finalized bundle/manifest. Control Center QA run [38130780202](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130780202) has passed deterministic tests and is still building at this checkpoint.

**Next:** verify the latest-head Control Center production build and final branch-head offline run. Do not dispatch the production pipeline to backfill history; the old report must stay UNKNOWN unless an original exact report artifact can be recovered. Keep PR #35 draft/unmerged and `main` untouched.

## Final verification checkpoint — 2026-10-11

Latest verified code/docs head before this checkpoint: `a821edae963e7327b8978a1bc3732b91efad645d`. Offline run [38130857054](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130857054) passed **136/136 tests**, including immutable attempt binding and the non-blocking workflow persistence contract. Control Center QA [38130857062](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130857062) passed the deterministic suite and production build. The live historical audit correctly remains `unknown-report-run-binding`; the old run predates the new binder, so no historical report hash is inferred. The binder now records exact final article/pack/report hashes for future pipeline runs without adding a publication gate.

**Next:** validate the next normal workflow execution's finalized attempt bundle when one occurs; do not dispatch production solely for this check. Keep PR #35 draft/open/unmerged, leave `main` untouched, and do not treat identifier matches as semantic factual verification.

## Production run artifact inspected — 2026-10-11

Read-only inspection of successful production pipeline run [38106429274](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38106429274) (run 493) and its uploaded `trendforge-article-attempt-493` artifact confirms the runtime evidence pack **was generated** for the Amazon/Nvidia article: 3,470,280 bytes, valid canonical envelope, 24 candidates, exactly one candidate matching the archived brief title, with 2 sources. The same run artifact contains the claim report (10 claims, saved `pass: true`) and matching `articlePath`; report SHA-256 `76768bf8089aab4b11df05a97883415fcf84e747af1190dcdd9a2b4800c3904a`, pack SHA-256 `4bb88ac97cb81f7c6c4845c2e13c661822ad884a4a4c9050d441ee6a4716759d`. Archived metadata binds workflow run `38106429274` and workflow SHA `a16223ff72c997f516f0def895962554c79946c1`, but does not record article/report/pack hashes. The root tracked pack being zero bytes is a persisted-root-snapshot issue, not proof runtime generation failed. The current branch's binder addresses missing hash lineage but has not been proven in production; do not dispatch production for testing. Next: inspect the next naturally occurring production run's finalized attempt bundle and verify its metadata hashes.

## Exact verifier-report lineage binding — implementation added, CI pending

Added `scripts/bind-boat-attempt-lineage.mjs` and its isolated fixture test. After the claim-verification gate, the pipeline now attempts to copy the exact `claim-verification.json` into the same-run article-attempt archive and records SHA-256 hashes for article, report and canonical evidence pack alongside `workflowRun`/`workflowSha`. It binds only when exactly one archive matches the same run, article path and exact article/pack bytes; ambiguity or mismatch fails closed. It also supports a quarantined article by hashing its archived bytes, without restoring it to the publication set. The step is diagnostic/non-blocking and explicitly records that semantic factual support is not assessed.

The root lineage audit now accepts report/run binding only when the same archive contains byte-identical report bytes and a matching `claimReportSha256`. A duplicate import caused one offline test failure; it has been corrected. Re-check latest-head offline suite and Control Center QA before declaring complete. Then inspect the next naturally occurring pipeline artifact/manifest; do not manually dispatch production.

## Verification update — 2026-10-11

Latest verified code head before this documentation-only record: `494764f5788aa17877e48e7a15b51390d7fc099f`. BOAT Offline Tests passed **136/136**; the isolated root-lineage CLI fixture proved exact article/report/pack hash binding while semantic factual support remained UNKNOWN. Control Center deterministic suite and production build both passed. Run links: [offline tests](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38132111529), [Control Center QA](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38132111445). This record itself will trigger fresh CI. Next: verify that documentation-only head, then inspect a naturally occurring production attempt archive after the binder is present; do not dispatch production or merge PR #35.

## Evidence artifact retention — 2026-10-11

Updated the pipeline's downloadable diagnostics: the article-attempt artifact now explicitly includes `data/authoritative-evidence-pack.json`, and a separate run-scoped artifact uploads `data/published-lineage/manifest-${GITHUB_RUN_ID}.json` immediately after lineage capture and before the site build. Both uploads are non-blocking and warn when no file exists; this does not alter publication gating or claim factual correctness. Added workflow-contract assertions for the exact pack path, manifest run ID path, step order, and no-manifest behavior. PR CI is the validation target; production publishing was not dispatched. Next: verify latest offline suite and Control Center build, then inspect a real run's retained artifact once one is naturally produced.

## Verified production-run evidence gap — 2026-10-11

Read-only inspection of successful scheduled pipeline run [38106429274](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38106429274) confirms the archived attempt `20261011-025404-amazon-eyes-8-b-nvidia-chip-financing-to-lighten-ai-capital-load` has a **zero-byte** `authoritative-evidence-pack.json` (same empty blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a` as root `data/authoritative-evidence-pack.json`). Its metadata identifies workflow run `38106429274` and source SHA `a16223ff72c997f516f0def895962554c79946c1`. The same attempt contains a non-empty brief and article. The run log shows `pre-writer-pipeline.mjs` completed and its source writes the canonical pack, so the checked-in empty pack is not merely a stale display issue: that particular attempt did not preserve evidence-pack bytes. Root claim report has 10 claims and saved `pass: true`, but cannot be independently bound to usable evidence from this empty pack.

Do not infer the precise truncation cause yet; inspect the successful run's artifact and all same-run pack writes in an isolated checkout before making a production-path fix. The PR now retains the canonical pack in downloadable attempt diagnostics and separately uploads the run-scoped lineage manifest. Workflow-contract and offline tests pass at the code revision; Control Center deterministic suite and production build also pass. Production workflow was not dispatched and PR remains unmerged.

## Artifact cross-check correction — 2026-10-11

Downloaded and inspected run `38106429274`'s retained artifact ZIP (`trendforge-article-attempt-493`, artifact ID `11689627673`). Important distinction: the **repository-committed** root and per-attempt evidence-pack blobs are zero bytes, but the **same run's downloadable artifact** contains a 3,470,280-byte attempt pack (SHA-256 `4bb88ac97cb81f7c6c4845c2e13c661822ad884a4a4c9050d441ee6a4716759d`) with 24 candidates; exactly one candidate title matches the archived brief. The artifact also contains the 10-claim saved report with `pass: true`. Thus runtime evidence did exist in the retained artifact, while Git-persisted pack bytes were lost/empty. The precise point where bytes disappear is still unproven; do not say the runtime pre-writer failed. Next compare the pipeline's first output commit with the post-reset transfer commit and add byte-count/SHA diagnostics around that transfer. The PR's new artifact uploads improve future retention but do not yet fix the observed Git-persistence discrepancy.

## Evidence-pack transfer observability — 2026-10-11

Implemented on the isolated PR branch: the pipeline output-commit step now logs the canonical evidence-pack worktree byte count, SHA-256 and Git blob ID before the first output commit; it then logs the committed blob ID/size, the post-transfer staged file bytes/hash/blob ID, and an explicit exact-match/mismatch/unknown result. These diagnostics are warnings/logs only and do not create a new publication gate. The observed artifact-vs-Git persistence discrepancy is still not explained; this change is intended to locate the exact stage in a naturally occurring scheduled run, not claim the fix is proven. No production run was dispatched.

Also added `scripts/boat-numeric-claim-coverage-audit.mjs` and its regression test to the BOAT offline workflow path filters, and expanded the workflow-contract regression test to assert both persistence checkpoints and those path filters. Latest-head offline CI and Control Center build are pending.

## Transfer diagnostics validated offline — 2026-10-11

At implementation commit `70a128b895ca719060e700b5f3a36f25ef1d13c1`, BOAT Offline Tests passed **137/137** (run [38136204355](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38136204355)); the Control Center deterministic suite and production build also passed (run [38136204315](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38136204315)). The workflow contract test checks byte/hash/blob diagnostics and the output-transfer shell syntax. Next: after the next naturally scheduled production run, inspect `EVIDENCE_PACK_PERSISTENCE` log lines at pre-commit, output commit, and post-transfer checkpoints and compare them with that run's artifact. Do not manually dispatch publishing or treat offline validation as proof that the production discrepancy is fixed. Latest documentation-only commits will trigger CI again.


## 2026-10-12 — Control Center security boundary design recorded

- Added `BOAT/CONTROL_CENTER_SECURITY_BOUNDARY.md` after confirming the Control Center is a static build-time snapshot (`output: 'export'`), not a server runtime or authenticated task API.
- Documented trust boundaries, no-secret-in-browser rule, least-privilege worker, pinned commit/task provenance, fail-closed authorization, artifact resume validation, CSRF/session requirements, threat mitigations, and approval binding for a future repair proposal.
- Important deployment gate: the manual-only workflow has static CI coverage but has not been dispatched. It may require a reviewed default-branch merge to become dispatchable. Do not merge merely to unlock the test; keep `main` unchanged until an explicit operator decision.
- Next: add offline schema/authorization-decision fixtures and negative tests for stale commit, cross-task/run resume, over-budget inputs, and artifact manifest mismatch. Keep the static Control Center read-only; no hosting/auth product chosen, no live API, no repair executor, no publish/provider/image calls.


## 2026-10-12 — Security-boundary documentation CI passed

- BOAT Offline Tests run [38224801135](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224801135) passed for security-boundary documentation commit `b060f4b58e470e49fb421fe3bb796e2745e20508`. Offline BOAT regression tests and the read-only published-root lineage audit both succeeded.
- This validates the PR checkout's existing offline suite and lineage audit; it does not test a live API, auth broker, manual workflow dispatch, or cross-run artifact resume.
- Next: add offline task request/response and artifact-manifest validation tests before selecting or implementing any live backend.


## 2026-10-12 — Follow-up record update CI passed

- BOAT Offline Tests [38224894861](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224894861) passed on the preceding project-record update commit `89d530359996a1ef772896e72b7b5e3a803a387a`, including the offline regression suite and read-only published-root lineage audit.
- The current follow-up only records that result. The manual audit workflow still has not been dispatched; no live API/auth broker exists.


## 2026-10-12 — Checkpoint artifact provenance hardened and CI passed

- Added `scripts/boat-task-artifact-manifest.mjs` plus tests. Each portable checkpoint now carries a manifest binding the source Actions run ID, task ID/type, pinned commit, audit profile/config hash, exact task JSON hash, and report hash.
- Manual resume now validates that manifest after downloading the artifact and before invoking the runner. The manifest is refreshed for the current run only after a successful prior-manifest validation, then included in the next checkpoint artifact. Wrong run/task/commit, modified JSON/report bytes, unsupported profile, or non-resumable status fails closed.
- BOAT Offline Tests [38225314231](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38225314231) passed for code/workflow commit `ec6eb586234487ced58804929c6c0d36cc988bc3`, including manifest unit/CLI tests, workflow safety tests, the existing offline suite, and the read-only published-root lineage audit.
- An earlier run [38225209463](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38225209463) caught over-escaped regexes in the static workflow test; those assertions were corrected before the passing run.
- Still not end-to-end: manual dispatch and cross-run artifact download/resume have not been exercised. Do not merge to `main` solely to unlock dispatch. Next: record this implementation in the project files, then continue offline request/schema and negative-resume coverage while awaiting an explicit deployment decision.


## 2026-10-12 — Offline task contract and authorization policy added (CI pending)

- Added `scripts/boat-task-contract.mjs` with request/response validators and a pure fail-closed authorization decision function; added request and response JSON Schemas under `BOAT/schemas/`.
- The initial request contract permits only bounded published-catalogue audits (batch sizes 10/25/50; 1/2/5 batches), a full pinned commit SHA, an idempotency key, and zero AI/web budgets. It rejects extra fields, arbitrary repository/workflow names, and unbounded full-catalogue requests.
- Trusted authorization context must be supplied by a future server adapter; the pure policy checks authenticated operator role, CSRF/origin checks, rate limit, fixed repository/workflow, task-type allowlist, commit allowlist, batch caps, zero budgets, and idempotency replay. It performs no network or workflow calls.
- Added `scripts/test-boat-task-contract.mjs` covering valid/invalid contracts and denial paths. Updated BOAT Offline Tests path filters so changes to the contract/test trigger CI. Validation for the latest head is pending; do not claim the tests passed until the run is inspected.
- No live endpoint, auth provider, UI wiring, repair execution, publish/provider/image call, merge, or `main` change. Next: inspect CI and align any schema/runtime mismatches before considering an authenticated broker.


## 2026-10-12 — Task contract and authorization tests passed

- BOAT Offline Tests [38226609696](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38226609696) passed on contract head `7ec5705010e1d28194aae4654be4721f72383d4b`: **168 passed, 0 failed**, including the new task request/response contract tests and read-only published-root lineage audit.
- Verified denials for unauthenticated/non-operator callers, invalid CSRF/origin, rate limiting, wrong repo/workflow, non-allowlisted task/commit, missing/oversized batch policy, budget expansion, idempotency replay, extra request/response fields, inconsistent counters, and malformed response state/error pairing.
- JSON schema files parse and match key runtime contract values. This is a contract smoke test, not a full JSON Schema standards validator.
- Current boundary remains offline-only: the authorization context is assumed to be created by trusted server code. No live authentication/API, idempotency database, workflow dispatch, publishing, provider/image call, article edit, merge, or `main` change.

# BOAT Next Step

## Current status and next action — 2026-10-11

**Current verified baseline:** candidate-envelope factual-proposal handoff is implemented for synthetic fixtures. Branch-head offline suite [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568) passed **77/77**, 0 failed, 0 skipped. A valid synthetic handoff returns `review_required`, keeps `semanticSupport: not_verified`, requires human approval, disables automatic application, and leaves article bytes unchanged. The three recovered historical attempts remain blocked from direct proposal-engine handoff because their original workflow metadata did not record the required artifact hashes. These results prove tested lineage/contract behavior, **not semantic factual support or production publishing readiness**.

**Completed this step:** the claim-verification quarantine metadata now sets `hashesRecordedInWorkflow` to `true` only when the article, claim report, and canonical evidence-pack SHA-256 values are all non-empty. If either report or pack is missing, the marker remains `false`; empty fields are not presented as a complete provenance bundle. A regression guard was added and branch-head offline suite [run 38121317875](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121317875) passed **77/77**, 0 failed, 0 skipped. This was an offline test run only; the publishing workflow was not executed.

**Documentation reconciliation completed:** the four project-memory files now use the latest 77/77 baseline; learning IDs are unique and historical pending labels are explicitly identified as point-in-time records.

**Completed this step:** added `BOAT/schemas/semantic-support-review.schema.json`, the human-review rubric `BOAT/SEMANTIC_SUPPORT_REVIEW.md`, and `scripts/test-boat-semantic-support-review.mjs`. The contract captures reviewer identity/role/conflict disclosure, exact workflow + three artifact hashes, claim/replacement/source/passage, component-level support, scope/time/attribution/uncertainty, verdict, risk flags, rationale, and advisory recommendation. It hard-locks `semanticSupport: not_verified`, approval required, automatic application false, and existing gates required.

**Completed and verified:** added `scripts/boat-semantic-support-review-validator.mjs`, a dependency-free, read-only CLI that validates records against the checked-in schema's keywords and independently pins all four safety invariants. It prints JSON to stdout, exits non-zero for invalid/missing/malformed input, and never writes a review record or article. Added `scripts/test-boat-semantic-support-review-validator.mjs` covering valid input, bad hashes, reviewer/timestamp failures, passage/URI failures, unsafe invariants, extra/missing fields, malformed/missing input, and read-only behavior. Added both paths to the offline workflow filters. Branch-head CI [run 38121773355](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121773355) passed **94/94**, 0 failed, 0 skipped after edge-case tests were added. The validator now rejects impossible calendar dates/out-of-range time fields and accepts absolute URI formats without requiring a hostname; a schema-keyword inventory test fails if the checked-in schema adds a keyword the validator does not explicitly support. Latest validator-contract CI [run 38121806369](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121806369) also passed **94/94**, 0 failed, 0 skipped.

**Completed implementation; latest CI pending:** added `BOAT/REVIEW_SET_POLICY.md`, `scripts/boat-semantic-support-review-set.mjs`, `scripts/boat-semantic-support-review-set-cli.mjs`, and `scripts/test-boat-semantic-support-review-set.mjs`. The read-only audit rejects repeated review IDs (even exact duplicate imports), reports differing contents under the same ID as blocking, excludes invalid/colliding records from comparisons, distinguishes same-reviewer repeats from independent reviewers, and flags independent verdict conflicts for human resolution. It never chooses an aggregate verdict; matching verdicts are descriptive only. Subject identity includes the exact bundle, claim, proposed replacement, source, and passage; reports expose a SHA-256 subject fingerprint rather than raw passage text. Rubric and offline workflow path filters were updated. Earlier run [38122064796](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122064796) passed **104/104** after correcting three test-harness issues; the latest fingerprint-hardening commits still need their branch-head CI result.

**Next:** inspect the latest CI; if green, move to review-set report fixtures and auditability, still without automated adjudication. Do not invoke providers, run publishing, weaken gates, merge PR #35, or touch `main`.

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

# BOAT Next Step

## Current status and next action — 2026-10-11

**Current verified baseline:** candidate-envelope factual-proposal handoff is implemented for synthetic fixtures. Branch-head offline suite [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568) passed **77/77**, 0 failed, 0 skipped. A valid synthetic handoff returns `review_required`, keeps `semanticSupport: not_verified`, requires human approval, disables automatic application, and leaves article bytes unchanged. The three recovered historical attempts remain blocked from direct proposal-engine handoff because their original workflow metadata did not record the required artifact hashes. These results prove tested lineage/contract behavior, **not semantic factual support or production publishing readiness**.

**Completed this step:** the claim-verification quarantine metadata now sets `hashesRecordedInWorkflow` to `true` only when the article, claim report, and canonical evidence-pack SHA-256 values are all non-empty. If either report or pack is missing, the marker remains `false`; empty fields are not presented as a complete provenance bundle. A regression guard was added and branch-head offline suite [run 38121317875](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121317875) passed **77/77**, 0 failed, 0 skipped. This was an offline test run only; the publishing workflow was not executed.

**Documentation reconciliation completed:** the four project-memory files now use the latest 77/77 baseline; learning IDs are unique and historical pending labels are explicitly identified as point-in-time records.

**Completed this step:** added `BOAT/schemas/semantic-support-review.schema.json`, the human-review rubric `BOAT/SEMANTIC_SUPPORT_REVIEW.md`, and `scripts/test-boat-semantic-support-review.mjs`. The contract captures reviewer identity/role/conflict disclosure, exact workflow + three artifact hashes, claim/replacement/source/passage, component-level support, scope/time/attribution/uncertainty, verdict, risk flags, rationale, and advisory recommendation. It hard-locks `semanticSupport: not_verified`, approval required, automatic application false, and existing gates required.

**Completed and verified:** added `scripts/boat-semantic-support-review-validator.mjs`, a dependency-free, read-only CLI that validates records against the checked-in schema's keywords and independently pins all four safety invariants. It prints JSON to stdout, exits non-zero for invalid/missing/malformed input, and never writes a review record or article. Added `scripts/test-boat-semantic-support-review-validator.mjs` covering valid input, bad hashes, reviewer/timestamp failures, passage/URI failures, unsafe invariants, extra/missing fields, malformed/missing input, and read-only behavior. Added both paths to the offline workflow filters. Branch-head CI [run 38121773355](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121773355) passed **94/94**, 0 failed, 0 skipped after edge-case tests were added. The validator now rejects impossible calendar dates/out-of-range time fields and accepts absolute URI formats without requiring a hostname; a schema-keyword inventory test fails if the checked-in schema adds a keyword the validator does not explicitly support. Latest validator-contract CI [run 38121806369](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121806369) also passed **94/94**, 0 failed, 0 skipped.

**Completed implementation; latest CI pending:** added `BOAT/REVIEW_SET_POLICY.md`, `scripts/boat-semantic-support-review-set.mjs`, `scripts/boat-semantic-support-review-set-cli.mjs`, and `scripts/test-boat-semantic-support-review-set.mjs`. The read-only audit rejects repeated review IDs (even exact duplicate imports), reports differing contents under the same ID as blocking, excludes invalid/colliding records from comparisons, distinguishes same-reviewer repeats from independent reviewers, and flags independent verdict conflicts for human resolution. It never chooses an aggregate verdict; matching verdicts are descriptive only. Subject identity includes the exact bundle, claim, proposed replacement, source, and passage; reports expose a SHA-256 subject fingerprint rather than raw passage text. Rubric and offline workflow path filters were updated. Earlier run [38122064796](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122064796) passed **104/104** after correcting three test-harness issues. Final review-set and documentation branch-head CI [run 38122117534](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122117534) passed **106/106**, 0 failed, 0 skipped. The report uses a SHA-256 subject fingerprint and tests ensure it does not echo raw claim/passage text.

**Next:** add deterministic review-set report fixtures and golden tests for duplicate-ID collisions, independent disagreement, same-reviewer repeats, and invalid records; verify stable output across input ordering while preserving source record order and all dissent. Keep the tool diagnostic-only. Do not invoke providers, run publishing, weaken gates, merge PR #35, or touch `main`.

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
- **Verification pending:** do not call this production-integrated or current published-article verification. The helper is not yet wired into `publish.yml`; no publishing/provider workflow was run, no article was edited, and `main` remains untouched.
- Next: inspect branch-head offline CI. If green, review manifest contract against the actual generated marker/report/pack shapes, then integrate only after proving same-run inputs and preserving the existing publication gates.

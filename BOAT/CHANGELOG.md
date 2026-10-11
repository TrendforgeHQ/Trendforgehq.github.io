# BOAT Changelog

All entries should describe actual work and results. Do not record planned work as completed.

## 2026-10-11 — Initial blueprint / Phase 0
- Inspected repository metadata and confirmed `main` is the default branch.
- Inspected `app/control-center/page.tsx`, `scripts/trendforge-supervisor.mjs`, `scripts/trendforge-self-learning.mjs`, and `.github/workflows/publish.yml`.
- Confirmed Control Center is static-export based; Supervisor is advisory-observational; Self-Learning is shadow/aggregate-oriented; publishing schedule is every six hours with manual dispatch and no current topic input.
- Added the BOAT blueprint, README, roadmap, canonical project state, decision log, permissions policy, learning register, baseline audit, and next-step file; updated root `PROJECT.md`.
- Created branch: `docs/boat-blueprint-phase0-2026-10-11`.
- Opened draft PR #35: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35
- Initial commit: `0a0dde3ea372013f605d12effaadbc0abdb77d31` (documentation changes; PR branch may receive a follow-up record commit).
- No paid provider was called. No article, publishing workflow, provider routing, production behavior, or gate was changed.
- Validation at last check: repository files and PR contents are available on GitHub; the draft PR reports no check runs yet. Build/test result is therefore **unknown/pending**, not passed.
- Next action: complete the read-only interface map described in [NEXT_STEP.md](NEXT_STEP.md), after reviewing this blueprint.


## 2026-10-11 — Phase 0.2 artifact map
- Inspected the pre-writer pipeline, authoritative evidence pack, adaptive writer evidence gate, smart claim verifier, grounding repair, editorial intelligence, quality validator, and publishing workflow sequence.
- Indexed three archived failed claim-verification reports as AD-FX-001..003 (runs 38085367295, 37996683799, 37696062759); they have not been replayed.
- Added the Article Doctor report schema, archived-fixture index, and offline test plan.
- Expanded the baseline audit with artifact producer/consumer/provenance/gap notes.
- No production source, articles, workflows, providers, or gates changed. No paid calls, image generation, build, or publish run triggered.
- Evaluator tests and schema/path checks remain pending; no passing result is claimed.

- Follow-up validation: report schema and fixture index both parse as JSON; all nine indexed article/report/metadata paths exist on main. No evaluator replay or build was run.


## 2026-10-11 — Phase 1 offline Article Doctor implementation
- Added `scripts/boat-article-doctor.mjs` for read-only diagnostics from saved article, claim report, and optional metadata; report includes provenance hashes, integrity findings, and limitations.
- Added `scripts/test-boat-article-doctor.mjs` covering archived fixtures, deterministic output, unsupported/contradicted/numeric/attribution/scope signals, title/run mismatches, CLI error behavior, and input immutability. Test execution is **pending**; no pass is claimed.
- Added `.github/workflows/boat-offline-tests.yml` scoped to the BOAT branch and BOAT PR paths. This workflow only invokes Node's built-in test runner; it does not call providers or publishing.
- Inspected failure logs for [run 38062572123](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38062572123): Step 14 failed because Run 405 calibration tried to download expired artifact `10713098432` and received HTTP 410. Earlier steps 1–13 passed; downstream steps were skipped.
- Inspected PR #34's follow-up run [38066111717](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38066111717): the live claim-verifier regression suite passed, while the historical calibration was skipped due to HTTP 410. The overall green result did not establish that calibration passed.
- Found the archived Run 405 article and `article-brief.json` on `main`, but the archived `authoritative-evidence-pack.json` file is empty and the original artifact listing is empty. Updated PR #34's calibration script to reconstruct a durable, clearly labelled evidence pack from saved brief grounding passages and to retain the expected 11/2/2 assertion. This is a reconstruction, not an exact historical replay; result pending actual CI logs.
- No direct `main` edits, merges, paid provider calls, publishing runs, image generation, or production gate changes were made.


## 2026-10-11 — Durable calibration result and follow-up
- Inspected PR #34 run [38110101089](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110101089): the archived-brief reconstruction produced 15 claims, 9 supported, 3 partial, 3 unsupported, average confidence 60; the verifier blocked as expected. The test wrapper failed because it still compared the reconstruction to the unavailable historical 11/2/2 distribution.
- Updated the durable regression to assert the actual reconstructed baseline (9/3/3), require a blocked verifier result, and print all claim-level statuses. It explicitly says the original historical 11/2/2 target remains unverified. This avoids mislabelling the reconstructed fixture as the original evidence pack.
- PR #34 run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) and BOAT offline run [38110190967](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110190967) were not yet complete at the time of this record update.


## 2026-10-11 — Article Doctor schema contract and verified test pass
- Expanded `BOAT/schemas/article-doctor-report.schema.json` to describe the full emitted report: subject, summary, finding/evidence objects, provenance hashes, checks, and limitations. This corrected the initial schema, which omitted runtime fields such as `reportId`, `generatedAt`, and `checks`.
- Added a dependency-free schema-contract smoke test to the Article Doctor suite. An initial attempt to write a custom recursive schema-subset validator caused syntax errors; that implementation was removed and replaced with a smaller direct contract test.
- Final CI result: [BOAT Offline Article Doctor Tests run 38110482104](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110482104), commit `c52a129cb8fc11350e6fabcd8ce38953aeb2a19f`: **7 passed, 0 failed, 0 skipped**. Isolated Node run at the same commit also exited 0 with 7/7 passed.
- No full JSON Schema validator or site build was run. The test checks key report/schema contract fields; do not describe it as a complete standards-compliant JSON Schema validation.
- Separate PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed the durable reconstructed Run 405 baseline (9 supported / 3 partial / 3 unsupported; verifier correctly blocks). The original 11/2/2 distribution remains unverified because its historical evidence pack is unavailable.
- No direct `main` changes, merges, paid providers, image generation, publishing runs, or production gate changes.
- Next step: add clean and partial-only fixtures, then deterministic read-only structural findings (empty headings and repeated sentences) without altering production gates.


## 2026-10-11 — Structural Article Doctor diagnostics
- Added read-only detection for empty Markdown headings and repeated sentences, excluding frontmatter and the Sources section from duplicate scanning.
- Added a synthetic regression requiring both structural findings to be linked to the article artifact with null JSON pointers and status `attention`.
- Initial run failed because a whitespace regex crossed line boundaries and prevented repeated-sentence detection. Restricted heading/list matching to horizontal whitespace; the regression then passed.
- Isolated Node test at commit `966b3311615e77def02699e6861d5020eee447bb`: **10/10 passed**, exit code 0, Node v20.9.0. GitHub Actions run for that commit was pending at the time of the record.
- No paid providers, source fetches, article edits, image generation, publishing runs, or production gate changes.


## 2026-10-11 — Archived article structural review and CI trigger correction
- Ran Article Doctor against all three archived fixture sets. They retained only the expected claim/attribution/scope diagnostics: AD-FX-001 = 2 findings, AD-FX-002 = 2, AD-FX-003 = 3. None produced empty-heading or repeated-sentence findings.
- Added a regression assertion guarding these archived samples against structural false positives. This sample is failure-biased and too small to estimate overall false-positive rate.
- Updated limitations to clarify that structural checks use exact normalized sentence matching/simple Markdown patterns and can miss paraphrased repetition.
- Latest isolated Node result at commit `dfa4f7e1090cf8df77cd48b4ff00e45a69e8b3a3`: **10/10 passed**, exit code 0, Node v20.9.0. GitHub Actions run [38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506) was in progress at the time of this entry.
- Observed that simultaneous push and pull_request triggers with one concurrency group cancelled the previous run; removed the push trigger and the unnecessary concurrency lock. Latest PR-triggered run is 38110774506.
- No production workflow, articles, providers, gates, thresholds, or publication behavior changed.


## 2026-10-11 — Latest Article Doctor CI pass
- Inspected [BOAT offline test run 38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506): **10 passed, 0 failed, 0 skipped** at commit `dfa4f7e1090cf8df77cd48b4ff00e45a69e8b3a3`.
- Confirmed the final logs include the schema-contract test, archived failure fixtures, clean/partial/unknown status tests, empty-heading/repeated-sentence diagnostics, and CLI error behavior.
- The archived real-article review found no empty-heading or repeated-sentence signals in AD-FX-001..003; tests now ensure those three samples do not receive structural false positives.
- Corrected the isolated workflow to avoid simultaneous push and pull_request runs cancelling each other. The latest PR-triggered run completed successfully.
- No production publishing workflow, article, provider routing, evidence/claim gates, or safety thresholds were changed.


## 2026-10-11 — Source-to-claim provenance in findings
- Added source metadata to claim findings from the saved verifier report: URL, title, source ID/role, matched passage IDs, and a source excerpt capped at 500 characters. The original claim-report JSON pointer remains alongside these fields.
- Expanded the report schema and added a regression verifying source metadata and the exact claim pointer for an archived unsupported claim.
- Final isolated Node run at commit `d532a48b78cd25d687dd55b3f59a40713431dddf`: **14/14 passed**. GitHub Actions [run 38110939177](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110939177) also passed 14/14.
- This is provenance reuse, not independent source verification: BOAT makes no external requests and does not assert that the cited page currently supports the claim.


## 2026-10-11 — Source-context coverage summary
- Added top-level `sourceCoverage` metrics to the Article Doctor report. The summary counts metadata fields in the saved claim report and reports `unknown`/null counts when no claims array exists.
- Audited saved fixtures: AD-FX-001 15/15, AD-FX-002 18/18, AD-FX-003 7/7 claims had URL, source ID, passage IDs, and excerpt; zero claims were missing any of those context fields. This is metadata completeness, not proof of source relevance or truth.
- Added regression coverage for the summary, missing source metadata, and the 500-character excerpt cap.
- CI [run 38111102258](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111102258) passed **17/17**, 0 failures.
- Next: a separate offline Evidence Auditor should cross-check claim-to-source lineage against the saved authoritative evidence pack; no external fetch or provider call is needed.


## 2026-10-11 — Evidence Auditor and bounded Repair Engine
- Added an offline Evidence Auditor for exact report/pack hash binding, workflow-run consistency, source IDs/URLs/roles, passage identifiers, and duplicate/conflicting source metadata.
- Added a bounded Repair Engine for empty headings and exact duplicate plain-text paragraphs. It only produces a separate proposed output; it refuses in-place edits and overwrites and protects frontmatter, code blocks, lists, and source sections.
- Added synthetic offline tests and a report schema; CI result is pending and is not yet claimed as passed.
- Expanded the BOAT offline workflow to run all `scripts/test-boat-*.mjs` suites. No provider/image generation or publishing workflow was triggered.
- Updated NEXT_STEP, PROJECT_STATE, and LEARNINGS with repair boundaries and the distinction between identifier lineage and semantic/factual support.


## 2026-10-11 — Offline audit/repair regression result
- GitHub Actions [run 38111515276](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111515276) passed **30/30** tests at code commit `7c422befd7f7bc5064d4e1774220a6763151f62a`: 17 Article Doctor tests and 13 Evidence Auditor/Repair Engine tests; 0 failed, 0 skipped.
- Tests cover exact report/pack hashes, wrong run, missing source/passage IDs, URL mismatch, conflicting source metadata, protected Markdown regions, separate-output behavior, refusal of in-place edits/overwrites, and post-repair Article Doctor checks.
- A later docs-only formatting correction is committed separately; its own CI check must be confirmed before describing the current branch head as green.


## 2026-10-11 — Latest branch-head validation
- The docs-only correction commit `df2231e49e1a72b071b8421d68277187403db91b` was validated by [BOAT Offline Tests run 38111608536](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111608536): **30 passed, 0 failed, 0 skipped**.
- This confirms the latest recorded branch head at this point; no full site build or publishing workflow was run.


## 2026-10-11 — Evidence Auditor CLI integration tests added
- Added end-to-end CLI tests that write a synthetic same-run claim report, evidence pack, and hash metadata to temporary files and invoke the real Node CLI process.
- Covered exit contract: clear returns 0; blocked lineage returns 1; missing exact hashes returns unknown/2; malformed report JSON returns 2 without a report.
- CI validation for these four new tests is pending. No production pipeline or paid provider was invoked.


## 2026-10-11 — CLI integration passed; factual repair proposal added
- [BOAT Offline Tests run 38112229842](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112229842) passed **34/34**, 0 failed, 0 skipped, including four Evidence Auditor CLI tests.
- Added `scripts/boat-factual-repair-proposal.mjs` and `BOAT/schemas/factual-repair-proposal.schema.json`. Proposal binds exact article, claim report, evidence pack, workflow run, claim/source/passage IDs and target claim text.
- Proposal output is never auto-applied and explicitly marks semantic support as not verified; human review and existing verifiers remain mandatory.
- Added five synthetic tests for exact bundle, article-hash mismatch, source/passage mismatch, claim-text mismatch, and CLI output/input immutability. Current CI validation is pending.


## 2026-10-11 — Factual Repair Proposal engine added
- Added `scripts/boat-factual-repair-proposal.mjs`, an offline proposal-only module bound to article/report/evidence-pack hashes and workflow-run metadata.
- Proposal validates claim/source/passage lineage and exact target-claim text. Output explicitly marks semantic support as not verified, requires approval, and never modifies the article.
- Added five synthetic regressions for valid bundle, hash mismatch, source/passage mismatch, missing claim text, and CLI input/output safety. CI pending.


## 2026-10-11 — Factual repair proposal regression passed
- [BOAT Offline Tests run 38112644061](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112644061) passed **39/39**, 0 failed, 0 skipped at commit `b9a7d4ff3c4f87aaa224d87b0bd1d3e26a3a6cbb`.
- This validates the CLI and five factual-repair proposal tests: exact bundle, hash mismatch, source/passage mismatch, missing claim text, and separate-output/input immutability.
- A separate explicit reviewer checklist is being added; its tests are not yet counted in that 39-test result.


## 2026-10-11 — Mandatory reviewer checklist validated
- Added six explicit checklist items to every factual repair proposal, covering semantic support, changed facts/qualifications, factual details, source suitability, existing verifier/editorial checks, and recorded reviewer decision.
- Updated the proposal schema contract and regression assertion.
- [BOAT Offline Tests run 38112722176](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112722176) passed **39/39**, 0 failed, 0 skipped at commit `c1f55308bab89c186ac5910037da379b6e0adf87`.
- Next: add read-only adapters for actual saved pipeline artifact shapes and explicit schema-contract tests, without running providers or publishing.


## 2026-10-11 — Latest BOAT branch-head check
- Current branch head `31957b4631dd41bbf3d69854d15e6ed21181f323` passed [BOAT Offline Tests run 38112777860](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38112777860), **39 passed, 0 failed, 0 skipped**.
- Corrected NEXT_STEP so the next implementation is a read-only adapter for real saved pipeline artifacts plus explicit schema-contract tests. No production/provider run is needed for that work.


## 2026-10-11 — Phase 1.1 read-only pipeline artifact adapter
- Inspected the saved AD-FX-001 attempt files: `article.md`, `claim-verification.json`, `article-brief.json`, and `metadata.json`.
- Verified the saved claim report uses `bestPassageId` values such as `S1-FF1,S2-FF6`; metadata records run ID/SHA but not article/report/evidence-pack hashes; the attempt directory contains no canonical evidence-pack JSON.
- Added `scripts/boat-artifact-adapter.mjs`. It preserves source claim fields/legacy IDs, does not manufacture provenance hashes, and forces proposal status to `unknown` when evidence-pack or recorded hash lineage is missing.
- Added `scripts/test-boat-artifact-adapter.mjs` covering mapping, legacy ID preservation, missing lineage, malformed JSON, and schema-contract invariants.
- Updated `BOAT/NEXT_STEP.md` and `BOAT/PROJECT_STATE.md` with the actual findings and pending-validation status.
- Validation for the new adapter suite: [run 38114116567](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114116567) passed **44 tests, 0 failed, 0 skipped**. Logs explicitly confirm all five adapter/schema-contract tests passed.
- No provider calls, external-source fetches, image generation, site build, publishing workflow, article modification, or production-gate changes.


## 2026-10-11 — Phase 1.1 adapter verification
- Inspected [BOAT Offline Tests run 38114116567](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114116567) and its job logs after the adapter/test commits.
- Result: **44 passed, 0 failed, 0 skipped**. The five new tests passed: valid mapping, legacy passage-ID preservation, missing lineage remains unknown, proposal schema contract, and malformed JSON handling.
- Updated canonical state and next-step records with the verified result. This confirms offline contract behavior, not semantic truth of the archived article or same-run lineage for the missing historical evidence pack.


## 2026-10-11 — Real archived-attempt adapter integration
- Added a CLI integration regression against the actual AD-FX-001 saved `article.md`, `claim-verification.json`, and `metadata.json`.
- Verified that absent canonical evidence-pack/hash lineage yields `unknown`; the command exits nonzero, keeps the proposal review-only, and does not modify the original input bytes.
- Latest run [38114233407](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114233407): **45 passed, 0 failed, 0 skipped**.


## 2026-10-11 — Cross-check archived artifact retention
- Inspected archived attempts for runs `37996683799` and `37696062759`; both have the same four-file shape as run `38085367295` and lack a canonical evidence-pack JSON file.
- All three archived metadata files record run ID and workflow SHA but no recorded artifact SHA-256 hashes. Legacy passage IDs include `S1-FF1,S2-FF6`, `S2-BODY`, and `S1-BODY`; no automatic conversion was added.
- Latest branch-head offline test run before this documentation record: [38114305258](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114305258), **45 passed, 0 failed, 0 skipped**.
- Next: inspect the evidence-pack producer and workflow artifact retention to determine whether exact same-run packs exist elsewhere.


## 2026-10-11 — Recovered original same-run evidence packs
- Downloaded still-live workflow artifacts for runs `38085367295`, `37996683799`, and `37696062759`.
- Located the authoritative evidence pack in each artifact's generated-pending-verification directory and confirmed those same sibling folders are checked into the repository. Root cause: the later claim-blocked quarantine step omits the pack, while the earlier generated-attempt directory remains in `data/article-attempts/` and in the uploaded run artifact.
- Added the read-only recovery audit and offline tests; recorded artifact IDs, expiry dates, pack checksums, source mapping, and claim/article coverage in `BOAT/ARTIFACT_RECOVERY.md`.
- Recovery-time hashes are explicitly distinguished from original generation-time hashes. Legacy passage IDs are not converted. Run 37696062759 has only 4/7 claim strings present in the final quarantined article and is marked partial for claim-specific use.
- Final recovery + passage resolver suite passed **57/57** in [run 38115430698](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38115430698), 0 failed, 0 skipped. The real-fixture test validates unique exact-text matches of 12/15, 12/18, and 4/7 claims, and confirms the source report is never rewritten.

## 2026-10-11 — Recovered proposal-input adapter

- Added `scripts/boat-recovered-proposal-input.mjs` as a separate offline adapter from recovery audit to human-review inputs; it does not generate replacement text or call the factual proposal engine with manufactured generation-time hashes.
- Rechecks recovery-time hashes against current article/report/brief/pack bytes, exact candidate selection, report/claim source URL lineage, article claim presence, and unique passage resolution.
- Added synthetic guard tests and real archived-run tests for 38085367295, 37996683799, and 37696062759; wired both new files into `.github/workflows/boat-offline-tests.yml` path filters.
- Branch-head offline CI [run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288) passed 64/64, 0 failed, 0 skipped. The first run exposed a bad estimate for the third archive; per-claim intersection was corrected to 2/7. No production behavior, publishing workflow, article, or `main` changes.



## 2026-10-11 — Recovered proposal-input schema and CLI validation

- Added the recovered proposal-input manifest schema and tests for its required fields and fail-closed review-only constants.
- Added CLI tests for a successful separate output file, overwrite refusal, article input immutability, and missing-argument rejection.
- Branch-head offline suite [run 38118585771](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118585771) passed **67/67**, 0 failed, 0 skipped.
- Archived eligibility intersection is 12/15, 12/18, and 2/7. The last run's 3 absent claims and 2 unresolved claims remain ineligible.
- No publishing/provider runs, article changes, production behavior changes, or merge.



## 2026-10-11 — Read-only proposal eligibility report

- Added a read-only stdout report with per-claim status, source/passage mapping, and eligibility reason codes for the three recovered attempts.
- Added integration assertions for 40 claims: expected 26 eligible, 3 blocked, 11 unknown; eligible counts per run 12/15, 12/18, 2/7.
- The report does not claim semantic support, create replacement text, or write article files. CI result is pending inspection.



## 2026-10-11 — Eligibility report verified

- Report CLI import defect found in [run 38118890184](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118890184) and fixed by explicitly importing pathToFileURL.
- Added a direct CLI test proving the report emits parseable JSON to stdout and writes no report file.
- Corrected branch-head suite [run 38118989732](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118989732) passed **69/69**, 0 failed, 0 skipped.
- Verified 40 claims total: 26 eligible, 3 blocked, 11 unknown; run-level eligible counts 12/15, 12/18, 2/7. Eligibility does not mean semantic support is verified.



## 2026-10-11 — Eligibility report schema

- Added a JSON Schema for the stdout-only eligibility report, including per-run/per-claim status and reason-code contracts.
- Added schema-contract assertions for recovery-time hashes, human approval, no automatic application, and unverified semantic support.
- CI validation is pending inspection.



## 2026-10-11 — Eligibility report schema verified

- Branch-head offline CI [run 38119136348](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119136348) passed **70/70**, 0 failed, 0 skipped, including the report schema-contract test.
- Report status remains 40 claims total: 26 eligible, 3 blocked, 11 unknown; semantic support is not verified.



## 2026-10-11 — Eligibility count reconciliation

- Eligibility report now derives counts from claim statuses, checks each run against adapter counts, and verifies aggregate/per-run totals agree; mismatches fail closed.
- Report schema requires countsReconciled=true at summary and run levels.
- Branch-head offline CI [run 38119336899](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119336899) passed **70/70**, 0 failed, 0 skipped.



## 2026-10-11 — Proposal-engine handoff blocked without original hashes

- Confirmed the existing factual proposal engine requires exact hashes in run metadata; recovered-byte hashes were not recorded at generation time and cannot be substituted.
- Added an explicit blocked handoff flag to adapter output and eligibility report, with schema and regression coverage.
- No direct adapter-to-proposal-engine connection was added. CI validation is pending.



## 2026-10-11 — Blocked handoff verified

- Branch-head offline suite [run 38119611350](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119611350) passed **70/70**, 0 failed, 0 skipped.
- Confirmed direct factual-proposal-engine handoff remains blocked without original workflow-bound hashes. No provider, publishing, article edit, or merge.



## 2026-10-11 — Workflow-recorded quarantine hash manifest

- Updated the claim-verification quarantine step to preserve the authoritative evidence pack and record hashes of the exact quarantined article, claim report, and evidence pack in same-run metadata.
- Adapter handoff now requires the metadata bytes to match the recovery audit, workflow-recorded hash provenance, all artifact hashes, run ID, and workflow SHA.
- CI [run 38120312395](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120312395) passed **73/73**, 0 failed, 0 skipped. No production publishing workflow was run.



## 2026-10-11 — Proposal-engine pack-shape guard

- Adapter now checks whether the canonical evidence pack has the source shape expected by the factual proposal engine, in addition to metadata-byte, hash, run, and workflow-SHA checks.
- Candidate-envelope packs remain blocked until the proposal engine can select a candidate by exact title/link.
- CI [run 38120500152](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120500152) passed **73/73**, 0 failed, 0 skipped.



## 2026-10-11 — Proposal-engine handoff gate

- Added an explicit factual-proposal-engine handoff predicate requiring original generation-time hashes, same-run metadata, matching workflow SHA, and matching artifact bytes. Recovery-time checksums cannot satisfy it.
- Added tests for a valid synthetic same-run bundle and tampered metadata fail-closed behavior.
- Branch-head CI [run 38120577418](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120577418) passed **73/73**, 0 failed, 0 skipped.
- Archived bundles remain ineligible for engine handoff because original hashes were not recorded.



## 2026-10-11 — Candidate-envelope proposal engine support

- Factual proposal engine now resolves canonical candidates[] packs only when proposal candidate title/link match exactly one candidate. Missing or duplicate identity fails closed.
- Added end-to-end adapter-to-proposal-engine regression; output remains review_required, human approval required, automatic application false, semantic support not verified, and article unchanged.
- CI [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568) passed **77/77**, 0 failed, 0 skipped.


## 2026-10-11 — BOAT project-memory reconciliation

- Updated `NEXT_STEP.md` so the current task reflects the verified candidate-envelope handoff baseline and the next safe, offline workflow-contract audit; retained the earlier recovery work as historical implementation record.
- Updated `PROJECT_STATE.md` to lead with the latest **77/77** branch-head offline result, current proposal-only safety boundary, archived-attempt limitation, and next task. Removed duplicate stale factual-proposal summary text.
- Renumbered learning headings uniquely in document order without removing learning content; added a note explaining that old `pending` labels are historical point-in-time records.
- Validation baseline referenced: [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568), **77/77 passed**, 0 failed, 0 skipped. Documentation-change CI result is to be checked after this commit. No provider or publishing workflow was run; PR #35 remains draft/unmerged and `main` untouched.


## 2026-10-11 — Fail-closed quarantine hash completeness marker

- Static review found the quarantine metadata wrote `hashesRecordedInWorkflow: true` even when the claim report or canonical evidence pack was missing and the corresponding hash string was empty. The downstream adapter already failed closed, but the metadata marker overstated bundle completeness.
- Changed the publish workflow gate to default the marker to `false` and set it to `true` only when article, claim-report, and evidence-pack hashes are all non-empty. The exact hash values and workflow run/SHA remain recorded in the same quarantine metadata.
- Strengthened the existing offline workflow-contract test to require the default-false marker, all-three-hash condition, dynamic metadata field, and absence of the unconditional `true` literal.
- Branch-head offline suite [run 38121317875](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121317875) passed **77/77**, 0 failed, 0 skipped. Publishing was not run; PR #35 remains draft/unmerged and `main` is untouched.
- Next: design a human-reviewed claim-to-passage semantic-support benchmark; lineage and exact text mapping alone must not upgrade `semanticSupport: not_verified`.


## 2026-10-11 — Human semantic-support review contract v1

- Added `BOAT/schemas/semantic-support-review.schema.json` to capture a single human review against one exact workflow/article/claim-report/evidence-pack/proposal bundle.
- Added `BOAT/SEMANTIC_SUPPORT_REVIEW.md` with conservative verdict rules (`supported`, `partially_supported`, `unsupported`, `unclear`), component-by-component assessment, scope/time/attribution/uncertainty checks, reviewer independence disclosure, disagreement handling, and limitations.
- Added `scripts/test-boat-semantic-support-review.mjs` for schema-contract and rubric regressions. Tests assert exact 64-hex artifact hashes, component-level review, advisory-only recommendations, and immutable safety constants: `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`, `existingGatesStillRequired: true`.
- This contract records human judgment; it is not a truth oracle, does not auto-apply edits, and does not bypass current claim/editorial/publication gates. The first CI run found one overly strict wording assertion in the test, now corrected; rerun status pending.
- Next: implement a read-only validator/CLI with fail-closed record checks; no providers, publish run, or `main` changes.


## 2026-10-11 — Validator edge-case hardening

- Tightened date-time validation to reject impossible calendar dates and out-of-range hour/minute/second fields instead of relying on permissive date parsing.
- Aligned URI validation with absolute URI format semantics rather than requiring every URI to have a hostname.
- Replaced the weak keyword-string assertion with a recursive inventory test that fails if the checked-in schema adds a keyword not explicitly supported by the dependency-free validator.
- Branch-head offline suite [run 38121773355](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121773355) passed **94/94**, 0 failed, 0 skipped. Revalidation after the test-contract update [run 38121806369](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121806369) also passed **94/94**.
- No providers, publishing, article changes, or main-branch changes. Next: define duplicate review-ID and conflicting-review handling; preserve independent dissent records.


## 2026-10-11 — Review-set identity and disagreement policy

- Added `BOAT/REVIEW_SET_POLICY.md`: repeated review IDs are blocking identity errors; invalid or ID-colliding records are excluded from comparison; same-reviewer repeats do not count as independent review; conflicting independent verdicts require human resolution; matching verdicts remain descriptive only.
- Added `scripts/boat-semantic-support-review-set.mjs` and `scripts/boat-semantic-support-review-set-cli.mjs` for read-only review-set auditing. The report never chooses an aggregate verdict or changes source records. Exact review subject identity includes workflow/bundle hashes, proposal, claim, replacement, source and passage.
- Added `scripts/test-boat-semantic-support-review-set.mjs` for duplicate IDs, ID collisions, independent disagreement/agreement, same-reviewer repeats, invalid records, exact-subject separation, CLI behavior, and input immutability. Added CLI paths to offline workflow filters and clarified the review rubric.
- Initial runs found three test-harness issues (two incorrect assertions/CLI target and one empty-stdout symptom from invoking the module instead of the CLI). Corrected these; [run 38122064796](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122064796) passed **104/104**.
- Follow-up hardening hashes the subject identity for compact reports and avoids echoing claim/passage text in the fingerprint; adds tests for replacement separation and fingerprint privacy. Branch-head CI [run 38122117534](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122117534) passed **106/106**, 0 failed, 0 skipped.
- No provider calls, publishing, article mutation, or main-branch changes. PR #35 remains draft/unmerged.


- **Next step:** add deterministic report fixtures/golden tests and stable report behavior while retaining every dissenting record; no automatic adjudication.


## 2026-10-11 — Review-set golden fixtures and permutation tests

- Added synthetic review-set fixtures for duplicate IDs, independent disagreement, same-reviewer repeats/disagreement, and invalid records.
- Added golden report projections and permutation tests to ensure semantic findings remain stable regardless of input ordering while the output's source-record array preserves the supplied order and all dissenting verdicts remain visible.
- Asserted that aggregate verdict remains null and automatic adjudication stays false. The report remains diagnostic-only; no majority vote, latest-wins, or canonical-record selection was added.
- Added fixture/test paths to the offline BOAT workflow filters. CI result pending inspection. No provider calls, publishing, article mutation, main-branch changes, or PR merge.


### Golden-test correction after first CI run

- Inspected failed run [38122385425](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122385425): 111/113 passed. The invalid-record fixture has two expected validation errors; corrected the golden count to match validator output. The permutation test now canonicalizes only order-insensitive summaries, while source record order is asserted separately and remains untouched.
- This was a test-harness correction only; no audit behavior, automatic-adjudication policy, or safety gate was weakened. Follow-up CI pending.


### Review-set golden fixtures — CI verified

- Corrected the golden harness after first CI surfaced an expected error-count mismatch and an invalid comparison between canonical summaries and source-ordered records.
- Verified run [38122442789](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122442789) passed **113/113**, 0 failed, 0 skipped. All four fixture categories and input-permutation/dissent-preservation tests passed.
- The correction touched tests only. Audit remains diagnostic-only, with no aggregate verdict or automatic adjudication. No provider/publishing run; main untouched; PR #35 remains draft/unmerged.


- Final branch-head recheck after trimming the fixture helper: [run 38122539254](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122539254), **113/113 passed**, 0 failed, 0 skipped, commit `9153fc66d0e37f31f0320a4ac3848670ee745f76`.


### Review-set ordering and report schema — 2026-10-11

- Made findings and subject groups deterministic across input permutations while preserving caller-order records and input-relative indices.
- Added a report JSON Schema and contract tests for record references, dissent retention, invalid-input handling, and no automatic winner. CI run 38122850780 passed 120/120 tests.


### Executable report-schema validation — 2026-10-11

- Added structural validation tests for real audit reports and invalid-input output, including negative cases for malformed fingerprints, unknown finding types, extra properties, and fixed safety fields.
- Malformed source identity types are normalized in report identity fields while validation errors remain available. CI run 38123099695 passed 123/123 tests, no failures or skips.


### Handoff metadata status guard — review finding (2026-10-11)

- Safety review found the recovered proposal-input handoff predicate did not explicitly require `status=claim-verification-blocked`, despite checking exact metadata bytes, run/SHA, recorded-hash marker, artifact hashes, and pack compatibility.
- Updated the predicate to require the exact blocked status and added a negative regression with otherwise matching hashes/identities but `generated-pending-verification` status.
- CI run [38123444976](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123444976) was queued at record time; do not mark verified until its result is inspected.
- No evidence of a current production bypass was found in the inspected workflow path; the change is defense-in-depth. No publishing/provider workflow was run.


- Verification complete: branch-head offline CI [run 38123484401](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123484401) passed **124/124**, 0 failed, 0 skipped; the new handoff-status regression passed. This verifies offline tests only, not semantic truth or publication readiness.


### Second safety-review pass — 2026-10-11

- Recovery audit fails closed when either archived metadata lifecycle status does not match the expected generated/blocked state; added two regression tests. CI run 38123747483 passed **126/126**.
- Semantic-review source URLs now require HTTP/HTTPS schemes; regression tests reject javascript, file, and FTP URLs. CI run 38123791630 passed **127/127**.
- These changes strengthen input validation without altering semantic-support state, proposal-only behavior, or publication gates.

### Offline CI path-filter fix — 2026-10-11

- Added `scripts/test-boat-semantic-support-review.mjs` to the BOAT Offline Tests workflow path filters. The test was already covered by `node --test scripts/test-boat-*.mjs`, but changes to that file alone would not reliably trigger this workflow.
- Test-triggering fix only; no production runtime, publishing logic, or safety threshold changed. Awaiting final branch-head CI.

### Final diff-review checkpoint — 2026-10-11

- Fixed the missing offline CI path trigger for `scripts/test-boat-semantic-support-review.mjs`.
- Offline CI run [38124374037](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38124374037) passed **127/127**, 0 failed, 0 skipped.
- Reviewed quarantine hash capture and confirmed the publication step still removes claim-blocked article output. No provider or publishing workflow was executed; PR remains draft/unmerged.

### Product-first scope realignment — 2026-10-11

- Reconciled the current implementation against the original BOAT goal. Recent schema/lineage work is foundation only; Control Center chat/task execution, complete published-article claim/evidence audit, public-web editorial benchmarking, secure approval gateway, controlled execution, and the full learning loop remain incomplete.
- Reprioritized the next step to the existing Control Center and a secure, read-only end-to-end vertical slice, then catalogue-wide article audits, public-web benchmarking, proposal/approval UX, controlled execution, and measured learning.
- No production behavior or gates changed in this documentation realignment. PR #35 remains draft/unmerged; no provider/publishing run; main untouched.


### 2026-10-11 — First user-visible BOAT catalogue slice

- Added `scripts/boat-published-catalogue-audit.mjs` as a read-only scanner for the full Markdown article directory; it identifies structural signals only and preserves explicit limits around factual verification.
- Added the Published Article Audit section to `app/control-center/page.tsx`, with article inventory, counts, flagged findings, and an explicit build-time snapshot / not-fact-checked note.
- Added responsive styling, type declaration for the helper, deterministic fixture tests, and BOAT workflow path filters for the new test.
- No article mutation, claim/evidence gate change, provider call, publish workflow run, or main-branch edit. CI and static build result still need inspection.


### Catalogue audit verification — 2026-10-11

- BOAT Offline Tests [38125272757](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125272757) passed **128/128**, including the new scanner fixture suite; Control Center contract suite passed **33/33**.
- Control Center QA [38125272747](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125272747) passed the production static build. Existing non-fatal webpack cache/CSS warnings remain.
- This validates the code path and build, not semantic truth, freshness, full claim-to-evidence coverage, or live chat. No providers or publishing workflows were called.


- Corrected a build-time type error after changing the inventory to the canonical article index: the table now keys/displays by article slug. Follow-up CI is pending.


- Follow-up CI green: [run 38125516855](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125516855) passed 128/128 offline tests and 33/33 Control Center checks; [run 38125516938](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125516938) passed the production build after the slug-field correction.


### 2026-10-11 — Historical claim-report coverage in Control Center

- Added archive scanning to map claim-verification reports to canonical published articles by `articlePath`.
- Added visibility into archived PASS/block/conflicting history, evidence-pack file presence, and claim-count records.
- Explicitly labels this as historical-only because current published bytes are not hash-linked to archived artifacts; missing evidence stays UNKNOWN and conflicting outcomes are not adjudicated.
- CI: [38125733728](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125733728) passed 128/128 tests and 37/37 Control Center checks; [38125733739](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125733739) passed production build.


## 2026-10-11 — Published lineage manifest builder (CI pending)
- Added `scripts/boat-published-lineage-manifest.mjs` for exact-byte SHA-256 records binding article, claim report, authoritative evidence pack, article brief, and current-run marker to the workflow run/SHA and canonical article path.
- Fail-closed conditions cover mismatched workflow run, invalid/unsafe article path, non-PASS or wrong-path report, empty claim list, invalid JSON, missing/ambiguous evidence-pack candidate, missing sources, duplicate article paths, and invalid timestamps.
- Added synthetic contract tests in `scripts/test-boat-published-lineage-manifest.mjs` and explicit BOAT offline workflow path filters.
- CI verification is pending. The helper is not yet integrated into the production publishing workflow or Control Center. No provider/publishing workflow, article mutation, or `main` edit was performed.
- Next: inspect branch-head offline CI and confirm real workflow artifact shapes before wiring manifest generation into publishing.


### Published lineage manifest builder — offline CI verified (2026-10-11)
- BOAT Offline Tests [run 38126927243](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126927243) passed **129/129**, 0 failed, 0 skipped; logs confirm the new lineage manifest contract test passed.
- Control Center deterministic suite passed **37/37** in [run 38126927298](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126927298); production build was still in progress at the last check.
- No provider/publishing workflow was run. The helper remains offline-only and is not yet wired into `publish.yml`.


### Control Center build verification for lineage-manifest branch head (2026-10-11)
- Final documentation-head Control Center QA [run 38126992154](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992154) passed. Logs confirm Next.js compilation, static page generation (100/100), and export (2/2).
- BOAT offline suite [run 38126992293](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992293) passed **129/129**, 0 failed, 0 skipped; Control Center checks passed **37/37**.
- This is offline/build verification only; publishing workflow was not run and lineage builder remains unintegrated.


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


## 2026-10-11 — Published lineage integration review
- Branch-head offline tests and Control Center production build both passed: runs 38127688568 and 38127688585.
- Inspected publish workflow ordering and output staging: lineage writer runs after SEO validation and before build, with continue-on-error enabled; manifest is under data/ and staged by the output commit path if the workflow reaches that step. Real publish-time persistence remains untested by design.
- PR #35 is still draft/open/unmerged; compare shows 5 commits behind main. No production publish, provider calls, article changes, merge, or main-branch writes.
- Next focus: offline/synthetic test for persistence and skip/failure cases, then inspect base divergence and complete PR diff before any merge recommendation.


## 2026-10-11 — Workflow persistence contract verification
- Added `scripts/test-boat-published-lineage-workflow.mjs` and included it in BOAT Offline Tests path filters.
- Latest branch-head verification passed: BOAT Offline Tests [38128016828](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128016828) and Control Center QA/production build [38128016780](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128016780), head `932d5878a8cd4cd4025ccc89954a716d28af020f`.
- The static contract test verifies lineage capture ordering, non-blocking configuration, environment wiring, immutable run-scoped output, no-article no-op/fail-closed safeguards, and the existing `data/` staging/transfer path. It does not prove actual production persistence.
- Reviewed branch divergence: five main-only commits since the merge base are generated intelligence-data refreshes; PR #35 remains draft/unmerged and main untouched. No production workflow dispatch or provider call.
- Next: make the path-specific manifest persistence assertion more explicit and finish changed-file/conflict review before any merge recommendation.


### Exact lineage manifest path assertions
- Strengthened `scripts/test-boat-published-lineage-workflow.mjs` to check the explicit `data/published-lineage/` directory, run-scoped manifest filename, and generated-output transfer allowlist.
- Initial regex escaping caused a test-only CI failure; corrected source passed BOAT Offline Tests [38128203466](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128203466) and Control Center QA/production build [38128203447](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128203447) at `5e24de25e22ca77a1e399b985d2c291fbeffb2a8`.
- No production workflow was dispatched; actual persisted manifest remains unverified. Next: final changed-file intersection review against main's generated-intelligence refresh commits.


## 2026-10-11 — Read-only audit of the actual published catalogue
- Added `scripts/boat-audit-published-catalogue.mjs` to inventory the canonical article catalogue and emit JSON findings and duplicate slugs, without modifying articles.
- Added `scripts/test-boat-audit-published-catalogue.mjs` to compare report inventory against actual `lib/articles.ts`, validate summary counts, and preserve the explicit non-semantic-audit limitations. Wired both paths into BOAT Offline Tests.
- Corrected CLI JSON newline after CI exposed a malformed output stream. Offline run [38128438403](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128438403) passed. Control Center QA [38128438407](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128438407) was pending at last poll.
## 2026-10-11 — Combined published article review queue

- Added a read-only CLI to combine structural catalogue findings, archived claim-report coverage, and exact-byte lineage into one triage queue for the actual canonical published article index.
- Added per-article priority, explicit human-review state, unknown/stale/conflicting signals, duplicate-slug ambiguity, and suggested review actions. No priority means factual correctness; no automatic repair or publication decision is permitted.
- Added synthetic and real-catalogue CLI integration tests and workflow path filters. CI verification pending inspection.

## 2026-10-11 — Claim-level published audit

- Added a read-only claim-level report over archived verifier attempts matched to current published articles by canonical `articlePath`.
- Report rows retain claim outcome, source identifiers/URLs/titles/roles, passage IDs and bounded excerpt, run metadata, current article text-match diagnostics, and all historical attempts including conflicts. Missing proof remains unknown; no latest-attempt winner is selected.
- Added synthetic and real-catalogue CLI tests and explicit offline workflow trigger paths. Verification pending.

### Claim-level audit source correction — 2026-10-11

- Included the root `data/claim-verification.json` snapshot in claim-level review when its canonical article path matches a published slug, labelled separately from archived attempts and without claiming exact-byte provenance.
- Fixed a regression-test fixture that lacked the current article Markdown file; expected missing-report state is now tested independently from missing-article state. Branch-head CI pending.

## 2026-10-11 — Root claim/evidence-pack lineage audit

- Added an offline, read-only root snapshot audit that reports saved claim outcomes, source IDs, passage IDs, and structural resolution independently from semantic factual support.
- Added deterministic regression coverage for empty/invalid packs, resolvable IDs, and missing source IDs; included both new paths in the offline workflow filters.
- Correction after checking the raw GitHub contents response: `data/authoritative-evidence-pack.json` is a valid ~3.46 MB canonical envelope with 24 candidates; the oversized-file helper returned an empty content field and was mistaken for an empty file. One candidate exactly matches the root article brief title and contains two sources. The root and archived pack share blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a`; archived metadata ties article+pack to run `38106429274`. The claim report lacks a run/hash field in the archive, so report-to-run binding remains UNKNOWN. Updated the auditor to parse the real envelope and trace normalized source/passage/fact IDs.
- CI verification for these latest commits is pending; no claim is made that the new tests have passed until the workflow result is checked.

- Follow-up correction: initial regression run exposed malformed CLI stdout caused by a literal `\\n` suffix. Replaced it with a real newline using `String.fromCharCode(10)` in `b70032893c8f9108f8d523e44f917ba8f1be2b37`; verify latest-head CI before calling the feature green.

## 2026-10-11 — Root lineage audit regression results

- Offline run [38129695590](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38129695590) passed 135/135 tests, including the new root claim/evidence lineage audit.
- Corrected the test harness to require UNKNOWN whenever exact report-pack binding is unavailable, even if local IDs happen to match. This avoids promoting unbound artifacts to a resolved lineage status.
- Corrected the CLI test's success text to say the root snapshot is unbound rather than assuming the pack is empty during concurrent tests. That wording-only follow-up is pending latest-head CI.

## 2026-10-11 — Isolated root lineage CLI regression

- Added `BOAT_AUDIT_ROOT` to run the read-only audit against an isolated fixture root.
- Replaced assertions tied to the checked-in mutable root pack (previously expected 24 candidates despite the tracked file being empty) with deterministic synthetic CLI coverage.
- Aligned candidate selection and fact-anchor resolution with the real canonical envelope: `candidates[]`, `evidenceBrief.relevantPassages`, and `storyFactMap.coreFacts`.
- Exact report/run binding remains UNKNOWN because metadata does not currently bind the claim-report hash. CI for the latest changes is pending.

## 2026-10-11 — Corrected large-file diagnosis; traced historical lineage gap

- Corrected the earlier zero-byte claim: GitHub's file-content wrapper omitted the oversized JSON body. Direct Git blob retrieval returned a 3,462,484-character canonical pack with 24 candidates.
- At output commit `f91f00e722b2946bb876c574363177000c9f2e4d`, root and archived attempt pack share blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a`. One candidate matches the archived brief title and both source URLs match the 10-claim report.
- Offline run [38130433463](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130433463) passed 135/135 tests and ran the live read-only audit: 10/10 source IDs and URLs matched; 9 passage IDs resolved; 0 unresolved passage IDs.
- Remaining issue is `unknown-report-run-binding`: historical run `38106429274` has no lineage manifest recording the claim-report hash. The old production workflow lacked the capture step; the current BOAT branch has a non-blocking capture step for future runs. No production run was dispatched and `main` was not changed.
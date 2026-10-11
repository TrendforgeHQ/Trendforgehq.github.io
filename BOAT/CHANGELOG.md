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
- Initial recovery audit suite passed 52/52 in [run 38115164158](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38115164158). A real-fixture integration test across the three actual attempts was then added; its branch-head CI result is pending inspection.

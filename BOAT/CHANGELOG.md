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

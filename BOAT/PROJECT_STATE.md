# BOAT — Canonical Project State

**Last updated:** 2026-10-11  
**State version:** 0.2.0  
**Current phase:** Phase 1 — Offline audit + sandbox repair foundations  
**Current verified status:** The read-only review-set policy/CLI, subject fingerprint hardening, and full BOAT offline suite passed **106/106** in branch-head [run 38122117534](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122117534), 0 failed, 0 skipped. All checks are offline contracts only, not proof of semantic factual support or production publishing readiness. Three recovered historical attempts remain blocked from direct handoff because original workflow metadata lacks the required generation-time artifact hashes. The quarantine metadata now marks workflow-recorded hashes `true` only when all three artifact hashes are present.

## Current boundary and next task
- The latest 77/77 suite validates offline contracts and synthetic proposal handoff only. It does not verify whether source passages semantically support claims, and it does not validate a live publish run.
- Added the v1 human semantic-support review schema, review rubric, and offline contract tests. The record requires exact bundle hashes, reviewer identity, component-level evidence assessment, rationale, and explicit safety invariants. It does not upgrade proposal semantic status or approve publication.
- Added a read-only review-record validator/CLI, strict timestamp edge checks, and a schema-keyword inventory guard; branch-head CI passed 94/94. Added a review-set policy and audit CLI to detect duplicate IDs and conflicting human reviews without adjudication; branch-head full-suite CI passed 106/106. Next: deterministic report fixtures and output-stability tests. Until a review is validated and existing gates independently pass, keep proposal semantic support `not_verified`; do not invoke providers or run publishing.
- Historical validation entries in this file are retained as dated records; the current status above takes precedence where old pending/count summaries conflict.

## Mission
Create a reliable, evidence-grounded, self-improving editorial operations bot for TrendForge with controlled permissions, article auditing, editorial benchmarking, urgent-topic prioritization, and durable project memory.

## Verified repository baseline
- Repository: `TrendforgeHQ/Trendforgehq.github.io`
- Default branch: `main`
- Existing Control Center route: `app/control-center/page.tsx`
- Control Center is statically exported and reads committed data snapshots at build time; it is not currently a live privileged chat/action backend.
- Existing Supervisor: `scripts/trendforge-supervisor.mjs`, output mode `advisory-observational`; its policy says it does not influence decisions or change evidence/claim/safety/publication gates.
- Existing Self-Learning: `scripts/trendforge-self-learning.mjs`, mode `shadow`; aggregates historical run metrics/signals and does not currently implement full claim-level editorial learning.
- Existing audit/memory assets include `scripts/trendforge-memory.mjs`, `scripts/trendforge-audit-trail.mjs`, `data/decision-log.jsonl`, and `data/trendforge-memory.json`.
- Publishing workflow: `.github/workflows/publish.yml`; scheduled every six hours and manually dispatchable. Current declaration has no topic/article input. The workflow includes source/evidence checks, claim verification and bounded repair/re-verification, editorial quality, image safety, and build/release steps.
- Several unrelated PRs were open at baseline. BOAT changes stay isolated.

## Current BOAT implementation
- Runtime: not implemented.
- Chat backend: not implemented.
- Approval gateway/button: not implemented.
- Article Doctor: offline read-only CLI; latest recorded regression passed 17/17 in run 38111154726. It does not independently fetch or verify sources.
- Evidence Auditor: offline identifier/lineage checker; requires exact artifact hashes and workflow-run metadata. The branch-head aggregate offline suite passed 77/77; historical per-step test counts below remain point-in-time records.
- Repair Engine: bounded structural proposal mode for empty headings and exact duplicate plain-text paragraphs; separate output only, with in-place edits/overwrites refused.
- Factual Repair Proposal: offline proposal-only module binds a proposed replacement to exact article/report/evidence-pack hashes, workflow run, claim/source/passage lineage, target text, and—when using a candidates[] pack—one exact candidate title/link match. Missing or ambiguous identity blocks. Successful synthetic handoff remains `review_required`, `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`; article bytes are unchanged. The latest aggregate branch-head suite passed 77/77.
- Artifact/recovery adapters and eligibility report: preserve saved fields and legacy passage IDs, verify exact bytes/lineage, and fail closed on missing provenance. The three archived fixtures yield 26 traceability/passage-eligible claims, 3 blocked, and 11 unknown; these counts do not establish semantic support. Direct proposal-engine handoff for these archived fixtures remains blocked. Candidate-envelope synthetic handoff now passes the 77/77 aggregate suite.
- Claim-level article audit: not implemented as a BOAT module.
- Human-article benchmark lab: not implemented as a BOAT module.
- Priority queue / targeted dispatch: not implemented.
- Persistent BOAT event schema: proposed only.
- Blueprint and documentation: committed on the BOAT documentation branch; awaiting review.

## Hard constraints
1. Do not directly commit changes to `main`.
2. Use a dedicated branch and PR; do not merge automatically.
3. Do not change production publishing behavior in Phase 0.
4. Do not bypass or weaken any evidence, claim, editorial, image-safety, or build gate.
5. Do not make paid provider calls merely to write documentation or diagnose a saved artifact.
6. Do not expose GitHub tokens/secrets in browser code or committed files.
7. Record every material action, result, and decision in this project folder.
8. Mark unverified claims as unknown; never invent successful tests or workflow outcomes.

## Phase ledger
| Phase | Goal | Status |
|---|---|---|
| 0 | Blueprint, baseline audit, durable project records | In progress — draft PR open |
| 1 | Offline artifact audit and bounded repair proposal | In progress — Article Doctor 17/17 passed; Evidence Auditor/Repair Engine CI passed 30/30 in run 38111608536 |
| 2 | Claim/source lineage audit and editorial benchmark evaluation | In progress — lineage auditor added; semantic source support and human benchmark not started |
| 3 | Fixture-backed repair sandbox and regression harness | Started — safe structural-only proposal mode; factual repair remains diagnosis/proposal-only |
| 4 | Secure approval gateway and Control Center workspace | Not started |
| 5 | Quota-aware priority queue and targeted workflow dispatch | Not started |
| 6 | Limited, measured, approval-bounded autonomy | Not started |

## Current verified progress
- Repository and relevant existing modules inspected.
- Existing static Control Center, shadow learning, advisory supervisor, and six-hour publishing cadence documented.
- Eleven documentation files added/updated in the blueprint PR.
- No production code, articles, provider routing, publishing workflow, or quality gates changed.
- No paid provider calls were made.
- Isolated BOAT workflow [38110482104](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110482104) passed 7/7 tests at commit `c52a129cb8fc11350e6fabcd8ce38953aeb2a19f`.
- Manual source inspection was performed; Markdown rendering/build validation remains pending.

## Repository record
- Branch: `docs/boat-blueprint-phase0-2026-10-11`
- Draft PR: https://github.com/TrendforgeHQ/Trendforgehq.github.io/pull/35
- Initial documentation commit: `0a0dde3ea372013f605d12effaadbc0abdb77d31`
- PR state at last check: open, draft, not merged.
- BOAT offline regression CI is green; full site build/deploy validation has not been run as part of this isolated test.

## Next task
Follow [NEXT_STEP.md](NEXT_STEP.md). Do not start runtime changes until Phase 0 documentation is reviewed and the read-only interface map is completed.


## Phase 0.2 update
- Artifact interface map added to BASELINE_AUDIT.md.
- Three saved failed claim reports indexed as regression seeds; no evaluator replay has been run.
- Report schema is now detailed; a dependency-free smoke test checks generated output against key contract fields. A full external JSON Schema validator remains unrun.
- No production workflow/article/provider/gate changes; no paid provider or image generation calls.
- BOAT test status is verified green for the recorded commit; later commits still require their own CI results.


## Validation update
- JSON parsing: pass for the report schema and fixture index.
- Fixture index contains 3 records; all 9 referenced archive paths exist on main.
- Article Doctor regression suite: 7 passed, 0 failed, 0 skipped in run 38110482104. No full site build or publishing workflow was run.


## Phase 1 implementation record — 2026-10-11
- Added `scripts/boat-article-doctor.mjs`: read-only extraction of saved verifier signals, title/run integrity checks, artifact SHA-256 hashes, and explicit limitations. It does not fetch sources, call providers, edit articles, or dispatch workflows.
- Added `scripts/test-boat-article-doctor.mjs`: deterministic fixture, finding-category, mismatch, CLI failure, and no-input-mutation tests. **The suite passed 7/7** in run 38110482104. A prior local clone attempt failed due to DNS, but a separate isolated Node run later passed.
- Added `.github/workflows/boat-offline-tests.yml`, scoped to the dedicated BOAT branch and BOAT-related pull-request paths. It runs only Node built-in tests and does not run publishing, image generation, or paid providers.
- Related independent reliability investigation: Run [38062572123](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38062572123) failed because the Run 405 calibration test tried to download expired artifact `10713098432` (HTTP 410). PR #34's previous successful run treated this as an explicit skip; that was not a calibration pass.
- The archived Run 405 article and brief are still committed, but its archived `authoritative-evidence-pack.json` is empty. A new test attempt on PR #34 reconstructs a labelled evidence pack from the saved brief passages; this is **not** an exact replay of the original historical pack. Calibration reconstruction result is now verified: run 38110223968 passed the 9/3/3 reconstructed baseline; the historical 11/2/2 target remains unverified.
- BOAT branch: `docs/boat-blueprint-phase0-2026-10-11`; draft PR #35 remains open and unmerged. No direct `main` changes, paid provider calls, image-generation calls, publishing runs, or gate/threshold changes were made for this work.


## Calibration follow-up — 2026-10-11
- Inspected PR #34 reliability run [38110101089](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110101089). Its reconstructed verifier output was **9 supported / 3 partial / 3 unsupported** (15 factual claims; average confidence 60; verifier correctly blocked), not the historical target 11/2/2. This attempt failed because the test still asserted the unavailable historical distribution against a reconstructed pack.
- Updated the test to treat 9/3/3 as the deterministic baseline for the reconstructed archived-brief fixture, require the verifier to block, and print each claim plus an explicit caveat. This does **not** establish the historical 11/2/2 result; the original evidence pack is unavailable.
- New PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) is in progress at this record update. Do not mark calibration complete until its final logs are inspected.
- BOAT offline workflow run [38110482104](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110482104) completed successfully: 7 passed, 0 failed, 0 skipped.


## Phase 1 validation result — 2026-10-11
- **PASS:** [BOAT Offline Article Doctor Tests run 38110482104](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110482104), tested commit `c52a129cb8fc11350e6fabcd8ce38953aeb2a19f): 7 tests passed, 0 failed, 0 skipped. Logs confirm archived fixture existence, deterministic read-only report output, claim-warning categories, title/run mismatch handling, CLI error behavior, input immutability, and the report-schema contract smoke test.
- The same seven tests passed in an isolated Node environment at commit `c52a129cb8fc11350e6fabcd8ce38953aeb2a19f`, exit code 0; working tree was clean. The GitHub Actions run is the authoritative CI result.
- Expanded `BOAT/schemas/article-doctor-report.schema.json` to describe nested subject, summary, finding, evidence pointer, provenance, check, and limitation fields. The test verifies the generated report against key schema contract fields; **a full external JSON Schema validator has not been run**.
- A first attempt to implement a custom schema-subset validator introduced syntax errors; that helper was discarded and replaced by a smaller dependency-free contract smoke test. Final test suite is 7/7 green.
- **Separate calibration:** PR #34 reliability run [38110223968](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110223968) passed. Its durable reconstructed Run 405 regression pins 9 supported / 3 partial / 3 unsupported and confirms the verifier blocks. The historical 11/2/2 target remains unverified because the original evidence pack is unavailable.
- BOAT draft PR #35 remains open and unmerged. No direct `main` changes, provider calls, image generation, publishing runs, or gate/threshold changes were made.
- Next: add clean and partial-only regression fixtures, then deterministic read-only article-structure findings (empty headings/repeated sentences) without changing publication gates.


## Structural diagnostics follow-up — 2026-10-11
- Added deterministic read-only findings for empty Markdown headings and repeated sentences in article body text. Sources section and frontmatter are excluded from the duplicate scan; findings point to the article artifact and do not mutate it.
- Added a regression test covering both findings and requiring `attention`, not `clear` or `blocked`.
- The first structural test failed because the empty-heading regex used `\s*`, which can cross line boundaries and consume neighboring prose during normalization. The scan was corrected to use horizontal whitespace for heading/list-line matching.
- Isolated Node test result at commit `966b3311615e77def02699e6861d5020eee447bb`: **10 passed, 0 failed, 0 skipped**, exit code 0, Node v20.9.0. The GitHub Actions run for this commit was pending at the time of this record; inspect its logs before claiming CI green.
- Next: audit the three archived real article attempts with these structural checks, review any false positives, and only then add further deterministic checks. No repair or publication action is enabled.


## Archived-article structural validation — 2026-10-11
- Ran the updated Article Doctor against AD-FX-001..003 using saved article/report/metadata files only. Outcomes remained `blocked` with 2, 2, and 3 mapped claim/attribution/scope findings respectively.
- None of the three archived articles triggered `empty_heading` or `repeated_sentence`; the structural scan produced no false positives on these three samples. This is a small, failure-biased sample, not a general false-positive-rate estimate.
- Added a regression assertion so the three archived fixtures remain free of structural false positives.
- Isolated Node test at commit `dfa4f7e1090cf8df77cd48b4ff00e45a69e8b3a3`: **10 passed, 0 failed, 0 skipped**, exit code 0, Node v20.9.0. GitHub Actions run [38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506) was in progress at the time of this record.
- CI workflow correction: push and pull_request triggers had shared one concurrency group, causing run [38110662190](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110662190) to be cancelled. Removed the duplicate push trigger and unnecessary concurrency lock; the latest pull-request run is now [38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506).


## Final result for this iteration — 2026-10-11
- **CI PASS:** [run 38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506), tested commit `dfa4f7e1090cf8df77cd48b4ff00e45a69e8b3a3`: **10 passed, 0 failed, 0 skipped**. Logs confirm schema-contract smoke test, archived fixture checks, deterministic output, claim warning categories, clean/partial status handling, structural diagnostics, artifact mismatch handling, and CLI failure behavior.
- Isolated Node run at the same commit also passed 10/10 (exit code 0, Node v20.9.0).
- Structural diagnostics were run against AD-FX-001..003. None produced empty-heading or repeated-sentence findings; regression tests now guard against false positives on those three archived samples.
- The BOAT-only workflow now uses a targeted pull-request trigger without the duplicate push trigger or unnecessary concurrency lock; run 38110774506 completed successfully.
- The historical Run 405 11/2/2 calibration remains unverified; the reconstructed 9/3/3 regression passed separately in run 38110223968.
- Next task: harden malformed/missing report and frontmatter cases, preserving `unknown` for artifact-integrity gaps.


## Source-to-claim provenance follow-up — 2026-10-11
- Claim-level findings now retain saved verifier context: source URL/title, source ID/role, passage IDs, and a source excerpt capped at 500 characters, alongside the claim-report JSON pointer.
- The report schema was updated to include those fields. The source context is copied from the saved verifier artifact; BOAT does **not** fetch or revalidate the URL and does not claim the excerpt independently proves the claim.
- Added a regression using AD-FX-001 to verify source URL/title/ID/passage lineage and the exact `/claims/{index}` pointer.
- Isolated Node tests at commit `d532a48b78cd25d687dd55b3f59a40713431dddf`: **14 passed, 0 failed, 0 skipped**, exit code 0, Node v20.9.0.
- **CI PASS:** [run 38110939177](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110939177): 14 passed, 0 failed, 0 skipped.
- Next: audit source-context coverage across all archived fixtures, including claims whose saved verifier output lacks URL/passage details, and keep missing context explicit rather than inventing it.


## Source-context coverage metrics — 2026-10-11
- Added a report-level `sourceCoverage` summary based only on fields in the saved claim-verification report: claim count, claims with URL, source ID, passage IDs, excerpt, and claims missing any of those context fields.
- If the claims array is absent, coverage status is `unknown` and counts are null—not zero. Missing source metadata remains null/empty and is never invented.
- Audited all three archived fixtures offline: AD-FX-001 = 15/15 claims with URL/source ID/passage IDs/excerpt; AD-FX-002 = 18/18; AD-FX-003 = 7/7. All had zero claims missing any context fields. This measures metadata presence only; it does not establish that sources are reachable or substantively support claims.
- Added tests for no source metadata and for capping source excerpts at 500 characters.
- **CI PASS:** [run 38111102258](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38111102258), commit `aab68b728f443d9ea9fa4892657e7f61fc42fcae`: **17 passed, 0 failed, 0 skipped**.
- Next: implement an offline Evidence Auditor that cross-checks claim source IDs and passage IDs against a saved authoritative evidence pack, while distinguishing lineage consistency from factual support.


## 2026-10-11 — Evidence Auditor and bounded repair implementation
- Added `scripts/boat-evidence-auditor.mjs` to cross-check claim source IDs, URLs, roles, passage IDs, duplicate/conflicting source records, and artifact identity.
- Exact artifact pairing requires `evidencePackSha256`, `claimReportSha256`, and a workflow run ID in metadata. Missing or mismatched lineage fails closed to `unknown`; a matching ID never proves factual truth or semantic support.
- Added `scripts/boat-repair-engine.mjs` for low-risk structural fixes only: empty headings and exact duplicate plain-text paragraphs outside protected sections. It writes to a new output path, refuses in-place changes and output overwrites, and leaves claims/sources/policy untouched.
- Added synthetic regression tests and an evidence-audit report schema. CI validation is pending; do not call this implementation tested until the run completes.
- No provider calls, source fetching, image generation, site build, publishing run, main-branch change, merge, or production gate modification.


## Phase 1.1 — Saved artifact adapter (2026-10-11)
- Inspected the actual archived attempt at `data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked/`.
- Confirmed `claim-verification.json` has `claims[]`, `sources[]`, `sourceId`, `bestUrl`, `sourceRole`, `bestPassageId`, and `provenanceFactMatches[]`; `metadata.json` records `workflowRun`/`workflowSha` but no SHA-256 artifact hashes; the archived directory has no canonical evidence-pack JSON.
- Confirmed legacy passage identifiers such as `S1-FF1` do not match proposal-engine canonical `S1-P1`; adapter preserves them without conversion and does not substitute article brief/source lists for an evidence pack.
- Added the read-only artifact adapter and offline tests including schema-contract assertions. Missing pack or recorded hashes is expected to force `unknown`.
- CI for this new adapter/test commit is pending; do not record the new suite as passing until logs are checked.
- No provider, publishing run, article change, site build, or production gate change.


## Phase 1.2 — Archived-attempt CLI integration (2026-10-11)
- Added a fixture-level CLI test using the actual AD-FX-001 archived article, claim-verification report, and metadata.
- The test deliberately supplies no evidence pack and confirms the CLI exits nonzero with proposal status `unknown`, retains `approvalRequired: true`, `automaticApplication: false`, and `semanticSupport: not_verified`, and leaves all three tracked input files byte-identical.
- Latest branch-head CI: [run 38114233407](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114233407), **45 passed, 0 failed, 0 skipped**.
- This is an integration test of fail-closed behavior; it does not establish semantic claim support or historical evidence-pack lineage.


## Phase 1.3 — Compare all archived blocked attempts (2026-10-11)
- Inspected the remaining two archived attempts, runs `37996683799` and `37696062759`, alongside AD-FX-001/run `38085367295`.
- All three directories contain `article.md`, `article-brief.json`, `claim-verification.json`, and `metadata.json`; none contains a canonical evidence-pack JSON file.
- All three metadata files record `workflowRun` and `workflowSha`, but not exact article/report/evidence-pack SHA-256 hashes.
- Legacy passage identifiers vary (observed examples: `S1-FF1,S2-FF6`, `S2-BODY`, `S1-BODY`). These cannot safely be rewritten as canonical `Sx-Pn` identifiers.
- The branch-head offline suite passed **45/45** in [run 38114305258](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114305258), 0 failures, 0 skipped, including the real archived-attempt CLI integration.
- Next audit target: inspect the authoritative evidence-pack producer and workflow artifact retention paths to determine whether exact same-run packs can be recovered; do not infer missing historical lineage from article briefs.


## Phase 1.4 — Recover exact same-run evidence packs (2026-10-11)
- Downloaded the original GitHub Actions artifacts for runs `38085367295`, `37996683799`, and `37696062759`. Artifact IDs: `11682276860`, `11647766077`, and `11515936671`.
- All three original workflow artifacts contain the canonical evidence pack in the earlier generated-pending-verification attempt directory. We also confirmed those exact sibling directories and packs are present in the repository. The pack was omitted from the separate claim-blocked directory, not lost.
- Inspected `.github/workflows/publish.yml`: the first archive step copies `data/authoritative-evidence-pack.json`; the later claim-blocked quarantine step does not copy that pack; the upload step includes the full `data/article-attempts/` directory, preserving the earlier copy.
- Added `scripts/boat-run-artifact-recovery.mjs` and `scripts/test-boat-run-artifact-recovery.mjs`. The audit selects one candidate only by exact brief-title match, checks workflow run/SHA/path metadata, validates report source IDs/URLs against the selected pack, computes explicit recovery-time checksums, and preserves legacy passage IDs. Added a real-fixture integration test across all three checked-in attempts.
- Detailed inventory and hashes: `BOAT/ARTIFACT_RECOVERY.md`.
- Results from recovered bytes: pack recovery 3/3; source-ID/URL mapping 10/10. Exact claim text is present in final article for 15/15, 18/18, and 4/7 claims respectively. The third run remains partial and is not safe for claim-specific proposals until reconciled.
- The computed hashes were not recorded at generation time; the manifest states this limitation. No semantic support is asserted.
- Final recovery + passage resolver suite passed **57/57** in [run 38115430698](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38115430698), 0 failed, 0 skipped. Real fixture assertions confirm unique passage matches of 12/15, 12/18, and 4/7; unresolved passage IDs are not guessed. No providers, publishing, site build, or article edits.

## 2026-10-11 — Recovered proposal-input adapter (validation pending)

- Added `scripts/boat-recovered-proposal-input.mjs`, a read-only adapter that consumes the recovery audit and exact recovered article, claim report, brief, and canonical pack bytes.
- Adapter verifies current bytes against recovery-time hashes, requires exact unique candidate selection, checks report/claim source IDs and URLs against the selected pack, and only marks a claim eligible when its exact text is present in the article and its source passage maps uniquely to canonical `Sx-Pn`.
- Missing/ambiguous passage mappings remain `unknown`; absent claim text and source-lineage mismatches are `blocked`. No replacement text is generated. Human approval remains mandatory; semantic support remains unverified.
- Added synthetic and three-real-archive integration tests and wired them into the offline PR workflow. Branch-head CI [run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288) passed 64/64, 0 failed, 0 skipped.
- `main` remains untouched, PR #35 remains draft/unmerged, and no provider, publishing, or site-build run was requested.



## Recovered proposal-input adapter (2026-10-11)

- Added `scripts/boat-recovered-proposal-input.mjs` and regression coverage in `scripts/test-boat-recovered-proposal-input.mjs`.
- Adapter verifies recovered-byte hashes against the audit manifest, exact candidate identity, report/pack source ID+URL mapping, claim/source URL mapping, exact claim text in the recovered article, and unique same-source canonical passage mapping.
- Expected real-fixture coverage: 12/15, 12/18, and 2/7 eligible claim inputs. The third sample has 4/7 article-text matches and 4/7 passage matches, but those sets overlap for only 2 claims; 3 claims absent from the article are blocked. Unresolved passages are not eligible.
- Output is an input manifest only; it does not generate replacement copy or edit content. Human approval is required, automatic application is false, and semantic support remains not verified.
- Offline CI [run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288) passed 64/64, 0 failed, 0 skipped. Latest docs/head recheck [run 38117465699](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117465699) also passed 64/64.



## Proposal-input schema and CLI validation (2026-10-11)

- Added `BOAT/schemas/recovered-proposal-input.schema.json` and schema-contract tests.
- Added CLI-boundary tests proving successful output creation at a new path, refusal to overwrite an existing output, article byte immutability, and rejection of incomplete arguments.
- Latest branch-head CI [run 38118585771](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118585771): **67 passed, 0 failed, 0 skipped**. The actual job log shows all three new schema/CLI tests passing.
- Historical adapter result: 12/15, 12/18, and 2/7 claims eligible for later human-authored proposals. Run 37696062759 has 3 report claims absent from article and 2 further claims unresolved; its 4/7 article coverage and 4/7 passage coverage overlap only for 2 claims.
- No provider calls, publication workflow, article edits, or merge. `main` remains untouched.



## Read-only proposal eligibility report (2026-10-11)

- Added a stdout-only report module `scripts/boat-recovered-proposal-review-report.mjs` for per-claim status/reason codes across the three recovered attempts.
- Regression expectation: 40 claims total, 26 eligible for a later human-authored proposal, 3 blocked because the saved claim text is absent from the article, and 11 unknown because passage mappings remain unresolved. Per-run eligible counts: 12, 12, 2.
- These are lineage/passage eligibility counts only; semantic support remains `not_verified`, recovery hashes were not generated at original workflow time, and automatic application remains false.
- Branch-head CI for this report is pending inspection. No production/publishing behavior was changed.



## Read-only proposal eligibility report — verified (2026-10-11)

- scripts/boat-recovered-proposal-review-report.mjs emits per-claim eligibility/reason codes to stdout without writing article or report files.
- Latest branch-head CI [run 38118989732](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118989732): **69 passed, 0 failed, 0 skipped**. Both the report integration test and direct CLI JSON-output test passed.
- Archived bundle totals: 40 claims; 26 eligible for later human-reviewed proposal inputs; 3 blocked because exact claim text is absent from the final article; 11 unknown due to unresolved passage mapping. Run-level eligible counts: 12, 12, 2.
- These are traceability/passage eligibility results, not semantic-support or truth determinations. Hashes are recovery-time only. PR #35 remains draft/unmerged; main untouched.



## Eligibility report schema (2026-10-11)

- Added BOAT/schemas/recovered-proposal-eligibility-report.schema.json and tests for the report's required fields and fail-closed guardrails.
- Schema requires per-run and per-claim status/reason codes, records hashes as recovery-time only, and fixes semanticSupport to not_verified and automaticApplication to false.
- Validation is pending branch-head CI inspection.



## Eligibility report schema — verified (2026-10-11)

- Schema contract tests passed in [run 38119136348](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119136348): **70 passed, 0 failed, 0 skipped**.
- The report contract preserves review-only semantics and explicit provenance caveats.
- Verified current report counts: 40 total claims, 26 eligible, 3 blocked, 11 unknown. The counts reflect traceability and passage mapping only.



## Count reconciliation — verified (2026-10-11)

- Eligibility report now derives counts from per-claim statuses and verifies them against adapter counts and per-run aggregates. A mismatch throws rather than producing a misleading report.
- The report schema requires countsReconciled=true for both summary and each run.
- Latest branch-head CI [run 38119336899](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119336899): **70 passed, 0 failed, 0 skipped**.
- Verified report totals: 40 claims; 26 eligible, 3 blocked, 11 unknown. Per-run eligible counts: 12, 12, 2.



## Proposal-engine handoff boundary (2026-10-11)

- Audited the existing factual repair proposal engine. It requires exact artifact hashes stored in run metadata and a workflow run ID; recovery-time checksums do not satisfy that provenance contract.
- Added proposalEngineHandoff {status: blocked, allowed: false} to recovered proposal-input manifests and exposed the blocked flag in the eligibility report and both schemas.
- Added tests to ensure the handoff remains blocked. Validation is pending branch-head CI inspection.



## Proposal-engine handoff boundary — verified (2026-10-11)

- Explicit blocked handoff is present in the recovered proposal-input manifest and report.
- Branch-head CI [run 38119611350](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119611350): **70 passed, 0 failed, 0 skipped**.
- Direct connection to the factual proposal engine remains intentionally disabled because recovered hashes were computed after generation, not recorded in original run metadata.



## Original metadata hash audit — verified (2026-10-11)

- Audited six generated/claim-blocked metadata files for runs 38085367295, 37996683799, and 37696062759.
- Run ID and workflow SHA agree within all three pairs, but 0/6 metadata files contain article/report/evidence-pack SHA-256 fields. Existing metadata cannot satisfy the factual proposal engine's hash contract.
- Recovery-time hashes are not substituted. The adapter/report explicitly set proposal-engine handoff to blocked.
- Latest docs/head CI [run 38119678517](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119678517): 70 passed, 0 failed, 0 skipped.



## Workflow-recorded quarantine hashes — validated (2026-10-11)

- Claim-verification quarantine now copies authoritative-evidence-pack.json and records articleSha256, claimReportSha256, evidencePackSha256, hashesRecordedInWorkflow, workflowRun, and workflowSha in the quarantine metadata.
- Adapter handoff requires exact metadata-byte binding to the recovery audit, matching artifact hashes, and matching run/SHA. Tampered metadata fails closed.
- Existing archived samples still have no hash fields and remain handoff-blocked; the workflow change only helps future quarantine artifacts.
- Offline CI [run 38120312395](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120312395): **73 passed, 0 failed, 0 skipped**. Publishing was not run.



## Pack-shape handoff guard — verified (2026-10-11)

- Existing factual proposal engine expects root-level evidencePack.sources; the authoritative recovered pack envelope stores sources under candidates[]. The adapter now marks handoff blocked unless the supplied pack shape matches the engine contract.
- Even valid workflow-recorded hashes are insufficient on their own; metadata-byte integrity, run/SHA, all artifact hashes, and engine-compatible pack shape are required.
- CI [run 38120500152](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120500152): **73 passed, 0 failed, 0 skipped**. Current archived runs remain handoff-blocked.



## Proposal-engine handoff gate — verified (2026-10-11)

- Recovered proposal-input adapter now separates claim eligibility from permission to invoke the factual proposal engine. The handoff predicate requires generation-time hashes explicitly recorded by the original workflow, byte/hash matches, and matching run/workflow-SHA identifiers.
- Added synthetic tests: a valid original-hash-bound same-run fixture satisfies the predicate; tampered run metadata blocks it.
- Latest branch-head CI [run 38120577418](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120577418): **73 passed, 0 failed, 0 skipped**.
- None of the three recovered production samples has the original hash provenance needed for handoff. No factual replacement was generated and no article was modified.



## Candidate-envelope proposal handoff — verified (2026-10-11)

- Factual proposal engine now supports canonical candidates[] packs with exact candidateTitle and candidateLink; missing or ambiguous candidate identity is blocked.
- Added an end-to-end synthetic handoff test from recovered input adapter to factual proposal engine. It reaches review_required only, keeps semantic support unverified, requires approval, disables automatic application, and leaves article bytes untouched.
- CI [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568): **77 passed, 0 failed, 0 skipped**.
- Existing three archived runs remain handoff-blocked because the saved original metadata lacks hash fields. This does not retroactively upgrade them.


## Review-set deterministic golden tests (2026-10-11; CI pending)

- Added `scripts/fixtures/boat-semantic-support-review-set-fixtures.mjs` with synthetic cases for duplicate IDs, independent reviewer disagreement, same-reviewer disagreement, and invalid-record exclusion.
- Added `scripts/test-boat-semantic-support-review-set-golden.mjs` with expected report projections, input-permutation stability checks, source-order preservation checks, dissent retention, and no-winner assertions.
- Golden projection normalizes only order-insensitive summaries; source `records` order remains exactly as supplied, and all verdicts remain preserved. This is deterministic audit/reporting only, not semantic truth validation.
- Added the fixture and test paths to `.github/workflows/boat-offline-tests.yml`. Branch-head CI result is pending inspection. No provider/publishing run; main untouched; PR #35 remains draft/unmerged.


### Golden-test CI correction

- First golden-test CI [run 38122385425](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122385425) ran 113 tests with 111 pass and 2 failures. The failures were in the test expectations: the invalid safety fixture correctly produced two validation errors, and the permutation comparison accidentally treated source-order records as order-insensitive.
- Corrected the expected error count and split the permutation assertion into a canonical summary comparison plus explicit source-order preservation checks. Revalidation is pending. No production review logic or safety gates were changed.


## Review-set deterministic golden tests — verified (2026-10-11)

- Offline CI [run 38122442789](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122442789): **113 passed, 0 failed, 0 skipped**.
- Golden report tests passed for duplicate IDs, independent disagreement, same-reviewer disagreement/repeats, and invalid records. Permutation tests compare order-insensitive summaries and independently prove the source `records` array retains caller order and every dissenting verdict survives.
- The initial 111/113 test-harness failure and correction are documented in the changelog/learnings. No production audit behavior or safety invariant was relaxed. This is offline contract evidence, not proof of factual truth or production readiness.


- **Final branch-head recheck:** [run 38122539254](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122539254) passed **113/113**, 0 failed, 0 skipped on commit `9153fc66d0e37f31f0320a4ac3848670ee745f76`, after fixture cleanup. All golden and permutation/dissent tests passed.


## Stable review-set report ordering — verified

- Findings and subject groups now have deterministic collection ordering independent of review input order. Subject groups sort by opaque SHA-256 fingerprint; findings sort by stable fields excluding input-relative record indices. Reviewer iteration and verdict arrays are normalized deterministically.
- The report's source `records` array and input-relative indices are not canonicalized or rewritten. Tests check multi-subject permutation stability, original record order, retained dissent, and no automatic winner.
- Offline CI [run 38122708610](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122708610) passed **114/114**, 0 failed, 0 skipped. This is diagnostic/report-contract validation only.


## Review-set report schema — verified

- Added `BOAT/schemas/semantic-support-review-set-report.schema.json` and schema contract tests. The envelope covers source records, findings, subject groups, fingerprints, verdicts, and record indices.
- The schema explicitly requires `aggregateVerdict: null` and `automaticAdjudication: false` for subject groups. Tests also confirm invalid-input handling and that indices resolve to caller-order records.
- Offline CI run [38122850780](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122850780) passed **120/120**, 0 failed, 0 skipped.


## Structural report validation — verified

- The review-set report test now performs executable schema validation of real auditor output, including invalid-input reports and malformed source identity types. Negative tests prove that extra properties, bad fingerprints, unknown finding types, and unsafe winner fields fail validation.
- Invalid source identity values are not copied into the typed report identity fields; the record remains ineligible and validator errors are retained.
- Offline CI [run 38123099695](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123099695) passed **123/123**, 0 failed, 0 skipped. The report remains diagnostic-only; no semantic truth or publication approval is implied.


## Report schema validation — verified

- Tests now structurally validate generated review-set reports and invalid-input output against the checked-in schema.
- Negative cases cover invalid fingerprints, unknown finding types, extra properties, and fixed report safety fields.
- Offline CI run 38123099695 passed 123/123 tests, with no failures or skips. This is report-contract validation only.

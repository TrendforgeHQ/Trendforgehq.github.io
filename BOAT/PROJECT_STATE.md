# BOAT — Canonical Project State

**Last updated:** 2026-10-11  
**State version:** 0.1.1  
**Current phase:** Phase 1 — Offline Article Doctor  
**Status:** Article Doctor code now has 10/10 passing isolated Node tests at commit `966b3311615e77def02699e6861d5020eee447bb`; the matching GitHub Actions run is pending at last check. Draft PR remains unmerged.

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
- Article Doctor: offline read-only CLI and 7-test regression suite implemented; CI run 38110482104 passed. Independent source re-checking is not implemented.
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
| 1 | Read-only artifact collection and Article Doctor report | In progress — clean/partial states and structural diagnostics implemented; 10/10 isolated tests pass; latest CI pending |
| 2 | Claim/source audit and editorial benchmark evaluation | Not started |
| 3 | Fixture-backed repair proposals and regression harness | Not started |
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

# BOAT Next Step

## Current task: historical evidence-pack recovery and passage-ID reconciliation

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
5. Next: build a separate proposal-input adapter that consumes the recovery audit and permits only unique exact-text passage mappings. Keep the proposal review-only; no semantic support claim and no automatic application.
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

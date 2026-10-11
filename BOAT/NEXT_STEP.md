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
- Added `scripts/test-boat-recovered-proposal-input.mjs` with synthetic lineage/hash/missing-claim/ambiguous-passage cases and all three real archived attempts. CI validation is pending; do not treat expected fixture counts as passed until the workflow is green.
- Recovery-time hashes are not represented as original generation-time metadata. Output always says `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`, and `replacementTextGenerated: false`.
- Next: inspect branch-head offline CI, fix any regression, then record observed eligible/blocked/unknown counts. Keep PR #35 draft and unmerged.

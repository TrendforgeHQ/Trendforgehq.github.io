# BOAT Learning Register

Keep verified observations separate from hypotheses. Each entry should include evidence and a validation status.

**ID integrity note (2026-10-11):** Historical entries had reused identifiers, which made references ambiguous. Headings have been renumbered uniquely in document order; the learning text and historical evidence are preserved. Validation labels such as “pending” describe the state at the time each entry was written, not the current branch-wide status. Current aggregate offline status is **77/77 passed** in [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568). This does not prove semantic support or production readiness.

## L-001 — Existing learning is not yet a complete editorial learning loop
- **Observed:** `scripts/trendforge-self-learning.mjs` aggregates run-level decision/evidence/claim/provider metrics and produces shadow-mode signals.
- **Implication:** BOAT needs article-level claim/source mappings and reviewed editorial examples before claiming it can learn why a particular article is better.
- **Evidence:** Source inspection of `scripts/trendforge-self-learning.mjs`.
- **Confidence:** High for the inspected script; not a claim that no other system can contain related logic.
- **Validation status:** Verified code observation.

## L-002 — Current Control Center cannot securely execute privileged actions by itself
- **Observed:** `app/control-center/page.tsx` is statically exported and consumes committed snapshots at build time.
- **Implication:** Chat history and approval UI can be displayed statically, but real privileged execution needs an authenticated server-side path.
- **Evidence:** Source inspection of Control Center page and repository architecture.
- **Confidence:** High for the current page; exact future hosting/backend options remain unassessed.
- **Validation status:** Verified code observation.

## L-003 — Manual dispatch alone does not provide article-specific urgency
- **Observed:** `.github/workflows/publish.yml` declares `workflow_dispatch:` without inputs and a six-hour schedule.
- **Implication:** Candidate-specific dispatch needs a deliberate workflow/interface change plus deduplication, quota, and gate tests.
- **Evidence:** Source inspection of the workflow header.
- **Confidence:** High for the current workflow declaration.
- **Validation status:** Verified code observation.

## L-004 — A green pipeline is not proof that every factual statement is correct
- **Observed:** Pipeline checks cover multiple stages, but their success only establishes that the implemented checks passed; it does not establish universal factual correctness.
- **Implication:** BOAT should sample and audit published claims against sources, and record false positives/false negatives.
- **Evidence:** General interpretation of automated validation boundaries; article-level baseline remains to be measured.
- **Confidence:** High as a validation principle.
- **Validation status:** Design principle; future baseline measurement required.


## L-005 — Artifact provenance
Observed: mutable data snapshots can be overwritten, while archived claim-blocked attempts include workflowRun/workflowSha metadata. Article Doctor should retain input hashes and run/SHA references. Hash binding is a design requirement, not implemented yet.

## L-006 — Fixture bias
Three archived blocked reports are useful regression seeds, but they do not represent all articles. Add passing examples before estimating overall quality or false-positive rates. Broad sampling has not been performed.


## L-007 — Expired historical artifacts must not masquerade as calibration success
- **Observed:** Run 38062572123 failed because the Run 405 calibration test downloaded artifact `10713098432`, which returned HTTP 410. A later run succeeded only because the calibration test explicitly skipped when the artifact was expired.
- **Observed:** The archived article and brief remain in the repository, but the saved archived evidence-pack file is empty; the original workflow artifact listing is empty.
- **Implication:** A skipped historical test is not a passed calibration. A reconstructed pack can support a repeatable regression, but must be labelled as reconstructed and cannot be called an exact historical replay.
- **Confidence:** High for the artifact response and repository file state; reconstructed verifier output remains unverified until CI logs are inspected.
- **Validation status:** Failure root cause verified; new durable reconstruction test pending.


## L-008 — Reconstructed evidence inputs need their own baseline
- **Observed:** The archived Run 405 article brief retains grounding passages and a story fact map, but its committed evidence-pack file is empty. Rebuilding a valid pack from the brief's saved grounding passages yields 15 factual claims: 9 supported, 3 partial, 3 unsupported, average confidence 60; the verifier blocks.
- **Observed:** The previous historical expectation was 11 supported / 2 partial / 2 unsupported, but that expected distribution came from an expired artifact whose exact evidence pack cannot currently be retrieved.
- **Implication:** Pin the reconstructed 9/3/3 result as a separate reproducible regression and retain 11/2/2 as an unresolved historical target. Never modify evidence inputs or verifier thresholds just to force counts to match.
- **Confidence:** High for the observed reconstruction output; the exact historical distribution remains unverified.
- **Validation status:** One failing test run established the mismatch; follow-up run is pending at the time of this entry.


## L-009 — Report schemas must match emitted runtime fields
- **Observed:** The initial Article Doctor schema was too shallow and omitted emitted fields including `reportId`, `generatedAt`, and `checks`. The schema was expanded and a report-contract smoke test added.
- **Observed:** A first custom recursive schema-subset test implementation introduced syntax errors; it was removed rather than allowed to weaken or destabilize the existing tests. The simpler contract test then passed with the complete suite.
- **Implication:** Keep the runtime report, schema, and tests in sync. Clearly distinguish a contract smoke test from full JSON Schema validation.
- **Confidence:** High; verified by source diff and CI run 38110482104 (7 passed, 0 failed).
- **Validation status:** Key contract fields verified; full formal schema validation remains open.


## L-010 — Structural checks must not consume neighboring prose
- **Observed:** The first repeated-sentence regression failed because a whitespace regex used `\s*` in a multiline heading matcher; JavaScript `\s` includes line breaks, so the normalization could span lines and remove text beyond the heading.
- **Fix:** Restrict heading/list line matching to horizontal whitespace (`[ \t]`) and keep the structural scan line-bounded.
- **Validation:** Empty-heading and repeated-sentence test passes in the 10-test suite at commit `966b3311615e77def02699e6861d5020eee447bb`; isolated Node exit code 0. Latest GitHub Actions run pending at the time of this record.


## L-011 — One pull-request test trigger avoids self-cancellation
- **Observed:** The isolated BOAT workflow originally ran on both `push` and `pull_request` with the same concurrency group. A run was cancelled as commits arrived, and queued runs showed no job yet.
- **Fix:** Keep the targeted `pull_request` trigger and remove the duplicate branch-push trigger and unnecessary concurrency lock for this short, read-only test job.
- **Validation:** [Run 38110774506](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38110774506) completed successfully: 10 passed, 0 failed, 0 skipped.


## L-012 — Source provenance is not source verification
- **Observed:** Saved claim reports contain fields such as `bestUrl`, `bestSource`, `sourceId`, `sourceRole`, `matchedPassages`, and `evidence`; these can be attached to a BOAT finding with a claim-report JSON pointer.
- **Fix:** Preserve these fields as copied provenance, cap excerpt length, and explicitly state that no network fetch or independent source re-check occurred.
- **Implication:** A source URL or passage ID improves traceability but does not, by itself, prove that the cited passage supports the claim. Future Evidence Auditor work must measure missing context and verify source support separately.
- **Validation:** CI run 38110939177 passed 14 tests, including the source-lineage regression.


## L-013 — Source-context coverage is not factual support
- **Observed:** The three archived claim reports have complete source-context metadata for their claims: AD-FX-001 15/15, AD-FX-002 18/18, AD-FX-003 7/7 have URL, source ID, passage IDs, and excerpt.
- **Implication:** High metadata coverage is useful for auditability but does not prove the cited source is reachable, current, relevant, or semantically supportive. A future Evidence Auditor must cross-check identifiers against the exact evidence pack and still label factual support separately.
- **Validation:** Source-coverage regression and full CI run 38111102258 passed 17 tests.


## L-014 — Exact artifact identity is a prerequisite for lineage checks
- **Observed:** The claim report and evidence pack are mutable root snapshots in the production pipeline, and legacy archived metadata does not necessarily contain hashes for both artifacts.
- **Implication:** A lineage auditor must require exact raw-file hashes and a workflow run identifier. Missing pairing data is `unknown`, not a pass. Synthetic tests do not substitute for validating a real same-run artifact bundle.
- **Validation:** New offline regression added; CI pending.

## L-015 — Start repairs with deterministic, reversible editorial changes
- **Observed:** Empty headings and exact duplicate paragraphs can be removed without generating new factual content, while changing a claim or citation requires evidence and re-verification.
- **Decision:** Initial Repair Engine is limited to those structural changes, writes only to a new output file, and refuses overwrite/in-place edits. Factual repairs remain gated on evidence and existing verifiers.
- **Validation:** Synthetic tests cover protected sections, input immutability, output-path guards, and a post-repair Article Doctor check; CI pending.


## L-016 — CLI behavior needs independent end-to-end coverage
- **Observed:** Function-level tests do not verify process exit codes, filesystem inputs, JSON parsing failures, or stdout/stderr behavior at the actual command-line boundary.
- **Decision:** Exercise the CLI against temporary same-run fixture files. Keep the exit contract explicit: clear=0, blocked=1, unknown/input error=2.
- **Validation:** Four CLI tests added; awaiting the matching GitHub Actions result.


## L-017 — Factual repair must be a review artifact, not an edit
- **Decision:** Bind a proposed replacement to exact raw article/report/evidence-pack hashes, workflow run, target claim, source ID, and canonical passage ID. Refuse missing or mismatched lineage.
- **Boundary:** Even a lineage-matched passage does not establish semantic support. Proposal output always marks `semanticSupport: not_verified`, requires approval, and never edits the article.
- **Validation:** Five synthetic tests added; current CI pending.


## L-018 — Factual repair needs exact lineage and must never auto-apply
- **Decision:** Bind a proposed replacement to exact article/report/evidence-pack hashes, workflow run, target claim, source ID, and canonical passage ID; refuse missing or mismatched lineage.
- **Boundary:** A matching passage ID does not establish semantic support. Output always marks support as not verified, requires human approval, and never edits the article.
- **Validation:** Five synthetic tests added; CI pending.


## L-019 — A factual proposal needs a visible human review checklist
- **Decision:** Make semantic support, changed factual details, source suitability, existing verifier results, and recorded human decision explicit checklist items.
- **Boundary:** Passing lineage tests alone never authorizes applying the proposal.
- **Validation:** Checklist output and schema assertions added; current CI pending.


## L-020 — Human review should be operationalized, not merely implied
- **Decision:** Proposal reports include a six-item checklist for semantic support, preservation of qualifications, factual details, source suitability, required verifier results, and reviewer identity/decision.
- **Validation:** Run 38112722176 passed 39/39 after checklist implementation. Actual pipeline artifact adapter and schema-contract coverage remain outstanding.


## L-021 — Saved artifact shapes cannot be assumed to match the proposal engine
- **Observed:** The archived claim-verification report stores source-linked claims and legacy `bestPassageId` values such as `S1-FF1,S2-FF6`; its metadata stores `workflowRun`/`workflowSha` but not the exact article/report/evidence-pack hashes; the archived attempt folder lacks a canonical evidence-pack file.
- **Implication:** An adapter must preserve original identifiers and distinguish artifact availability from proof of same-run lineage. It must not derive hashes and then present them as recorded provenance, or substitute an article brief for the evidence pack.
- **Evidence:** Inspected the saved AD-FX-001 files in `data/article-attempts/20261010-205638-anthropic-ai-model-submits-false-murder-tip-to-philadelphia-police-claim-blocked/`.
- **Confidence:** High for the inspected archived attempt only; not a claim that every pipeline run uses this exact shape.
- **Validation status:** Adapter/schema-contract tests and the real archived-attempt CLI integration passed in [run 38114233407](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38114233407), 45 passed, 0 failed, 0 skipped. The archived attempt still has unproven lineage.


## L-022 — Three archived blocked attempts share a provenance-retention gap
- **Observed:** Three archived blocked attempts (runs `38085367295`, `37996683799`, and `37696062759`) each contain article, brief, claim-verification report, and metadata, but no canonical evidence-pack JSON. Metadata records `workflowRun`/`workflowSha` but not exact artifact SHA-256 hashes.
- **Observed:** Saved passage labels vary across legacy formats, including `S1-FF1`, `S2-BODY`, and `S1-BODY`; these do not establish a canonical `Sx-Pn` mapping.
- **Implication:** Do not claim the new factual proposal engine can validate same-run lineage for these archived attempts. Inspect producer/retention code for a recoverable exact pack; otherwise keep the result unknown.
- **Evidence:** Directory listings and parsed metadata/claim-report fields for all three archived attempts.
- **Confidence:** High for these three checked directories only; not a claim that every historical run has the same retention pattern.
- **Validation status:** The fail-closed integration test passed in run 38114305258 (45/45 offline tests); historical lineage remains unverified.


## L-023 — Same-run evidence packs can survive outside claim-blocked directories
- **Observed:** The original workflow artifacts for runs `38085367295`, `37996683799`, and `37696062759` each contain the canonical evidence pack in the generated-pending-verification attempt folder; the same generated-attempt folders and packs are also present in the repository.
- **Root cause:** The initial archive step copies the pack; the later claim-blocked quarantine step copies article/brief/report/metadata but omits the pack. Since the uploaded artifact includes the full `data/article-attempts/` directory, the earlier generated-attempt copy survives.
- **Validation:** Exact brief title selected one candidate in all three packs. Report source IDs/URLs matched 10/10 selected pack sources. Claim-text presence in final article was 15/15, 18/18, and 4/7.
- **Caveat:** Recovered-byte hashes are computed now, not recorded by the original workflow. Matching IDs/URLs does not establish semantic support. The 4/7 run remains partial.
- **Code:** `scripts/boat-run-artifact-recovery.mjs`; tests: `scripts/test-boat-run-artifact-recovery.mjs`; detailed checksums: `BOAT/ARTIFACT_RECOVERY.md`.
- **Validation status:** Synthetic recovery audit tests passed as part of 52/52 in run 38115164158. A real-fixture integration test across all three actual attempts has since been added; its branch-head CI result is pending inspection.


## L-024 — Passage-ID migration must be exact-text based and non-mutating
- **Observed:** Legacy verifier labels include Sx-FFn, Sx-BODY, and multi-source lists. They do not directly encode the canonical Sx-Pn list index.
- **Change:** Added a conservative resolver that searches only the saved claim's own source passages. It reports a canonical ID only for one exact normalized text match; it may collapse an identical sentence repeated verbatim, but does not use lexical similarity or the legacy ID as evidence.
- **Real sample result:** 12/15 unique matches for run 38085367295; 12/18 for 37996683799; 4/7 for 37696062759. Remaining claims stay unresolved; 0 ambiguous matches in this sample.
- **Validation:** [run 38115430698](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38115430698), 57 passed, 0 failed, 0 skipped, including all three real archived attempts and synthetic ambiguity/no-match cases.
- **Debugging record:** CI first caught a repeated-sentence whitespace-splitting defect; after fixing it, another run caught passage-coverage assertions placed in a synthetic test where fixture counters were not in scope. Both were corrected before the green branch-head run.
- **Safety:** Resolver output is a suggestion only. It does not alter the claim report, article, factual status, or publication gates; semantic support remains unverified.

## L-025 — Recovery-time hashes must not be promoted into original provenance

- **Decision:** The recovered proposal-input adapter verifies the audit's computed checksums against current bytes but never copies those checksums into original workflow metadata or calls them generation-time hashes.
- **Decision:** A claim is eligible only when exact claim text occurs in the recovered article, claim/report/pack source IDs and URLs align, and the recovery resolver reports one canonical exact-text passage from that same source.
- **Fail-closed behavior:** Missing or ambiguous passage is `unknown`; missing article claim or source-lineage mismatch is `blocked`. Human approval remains required; semantic support is not verified; no replacement text is generated or applied.
- **Validation status:** [Run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288) passed 64/64 tests, including all three real archives.


## L-026 — Independent coverage ratios must not be treated as an intersection
- **Observed:** For archived run 37696062759, 4/7 report claim strings are present in the article and 4/7 claims have unique passage mappings, but only 2 claims satisfy both conditions simultaneously.
- **Decision:** Proposal eligibility must be computed per claim from the intersection of exact article-text presence, same-source URL lineage, and unique canonical passage mapping; independent aggregate counts cannot be multiplied or assumed to overlap.
- **Validation:** First CI run exposed the mistaken expected count of 4; regression now expects 2 eligible claims for this run. [Run 38117403288](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38117403288) passed 64/64 tests.



## L-027 — Proposal inputs must be narrower than recovered artifacts

- A recovered evidence pack does not automatically make every saved claim safe to repair.
- Eligibility requires exact claim text in the final article, source ID/URL agreement across claim/report/selected pack, and a unique exact-text passage mapping from that same source.
- Recovery-time hashes protect the recovered files from subsequent accidental changes but are not original workflow hashes; never represent them as generation-time provenance.
- The adapter emits inputs only. Human review and the existing verifier/editorial gates remain mandatory; semantic support is not verified.
- Synthetic and all-three-real-run regression coverage added; CI result pending inspection.



## L-028 — Adapter CLI boundaries must preserve the original article

- The proposal-input CLI must write only to a new output path; it refuses output/input collisions and existing output files.
- Tests verify that a successful run leaves the article byte-identical and that incomplete arguments fail without writing a manifest.
- The manifest schema locks human approval, disabled automatic application, unverified semantic support, and recovery-time (not generation-time) hashes.
- Validation: [run 38118585771](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118585771), 67 passed, 0 failed, 0 skipped.



## L-029 — Eligibility is the intersection, not either individual coverage count

- A claim is eligible for a later proposal only when exact article text, matching source lineage, and a unique same-source passage mapping all pass together.
- In the 10x Research archived run, 4/7 claim strings are present in the article and 4/7 have unique passage matches, but only 2 claims meet both conditions. Do not infer eligibility by using either count alone.
- The new stdout-only report lists every claim's status and reason codes; it does not assert factual support or modify content.
- CI validation of the report is pending inspection.



## L-030 — Keep CLI entry-point imports explicit in modules imported by tests

- The first eligibility-report CI run failed because the report's CLI guard referenced `pathToFileURL` without importing it. The test runner imports the module directly, so the failure surfaced before the report assertions.
- Added the missing named import. This is a module initialization defect, not a data or eligibility failure.
- Failed run: [38118890184](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118890184). Validation of the corrected branch is pending.



## L-031 — A read-only report needs an actual CLI test, not just an imported function

- Import-based tests did not exercise the report's command-line entry point. The first report suite caught a missing pathToFileURL import at module initialization.
- Added the explicit import and a direct child-process test that parses stdout JSON and asserts no report file is written.
- Corrected branch-head CI: [run 38118989732](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38118989732), 69 passed, 0 failed, 0 skipped.
- Verified report counts: 40 total, 26 eligible, 3 blocked, 11 unknown. Eligibility remains traceability-only, not semantic support.



## L-032 — Keep report schema aligned with review-only output

- Downstream report consumers need an explicit contract for per-claim statuses and reason codes, not just a successful JSON parse.
- Added a report schema and tests that preserve the review-only constraints: recovery-time hashes, semantic support not verified, and automatic application disabled.
- Branch-head CI validation is pending inspection.



## L-033 — Report contracts must preserve provenance caveats

- The eligibility report schema explicitly requires recovery-time checksum provenance, not generation-time provenance; it also locks semantic support to not_verified and automatic application to false.
- Schema-contract CI: [run 38119136348](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119136348), 70 passed, 0 failed, 0 skipped.



## L-034 — Reconcile report totals from leaf records

- Do not trust summary counters without recomputing them from the underlying per-claim statuses.
- The report now checks per-run claim counts against the adapter and verifies aggregate counts against per-run totals. Mismatches fail closed.
- CI: [run 38119336899](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119336899), 70 passed, 0 failed, 0 skipped.



## L-035 — Never substitute recovery-time hashes for original workflow hashes

- The factual proposal engine requires exact hashes bound to run metadata. Hashes computed now from recovered artifacts do not prove which bytes the original workflow hashed.
- The recovered proposal-input adapter now marks direct handoff to the factual proposal engine blocked until original generation-time provenance is available.
- Regression tests and schemas enforce allowed=false. CI validation is pending.



## L-036 — A blocked handoff is safer than provenance reconstruction by assumption

- Even if recovered source and passage mapping is exact, the existing factual proposal engine's metadata hash contract cannot be satisfied by checksums computed after the original run.
- The adapter now explicitly sets proposalEngineHandoff.allowed=false. Regression suite passed [run 38119611350](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119611350), 70 passed, 0 failed, 0 skipped.



## L-037 — Archived metadata proves the original hash contract is unavailable

- Inspected all six generated and claim-blocked metadata files across the three recovered attempts.
- All 3 pairs agree on run ID and workflow SHA, but none includes article/report/evidence-pack SHA-256 fields.
- This is why the existing factual proposal engine cannot safely consume these recovered artifacts. Do not reconstruct the original hash fields from hashes computed during recovery.
- Verified on the same branch as [run 38119678517](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38119678517), 70 passed, 0 failed, 0 skipped.



## L-038 — Capture hashes on the exact quarantine bundle, not the pre-repair article

- The initial generated-attempt archive may capture article bytes before bounded repairs and before the claim report exists; those hashes would not bind the final blocked bundle.
- The claim-verification quarantine step now copies the exact final article, claim report, and authoritative evidence pack, then records their hashes together with the run ID/SHA.
- The adapter requires metadata-byte integrity and exact hash/run/SHA matches before permitting a future proposal-engine handoff. Old archived runs without these fields remain blocked.
- Validation: [run 38120312395](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120312395), 73 passed, 0 failed, 0 skipped. Publishing was not run.



## L-039 — Hash integrity is necessary but not sufficient for handoff

- A hash-bound bundle can still be incompatible with the consumer's data contract. The factual proposal engine expects root-level sources; recovered authoritative packs place sources inside candidates[].
- The adapter therefore requires a compatible pack shape before allowing handoff. Candidate-envelope support must select by exact candidate title/link and fail closed on missing or ambiguous identity.
- Validation: [run 38120500152](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120500152), 73 passed, 0 failed, 0 skipped.



## L-040 — Claim eligibility does not authorize proposal-engine handoff

- Keep “eligible to prepare a review input” distinct from “safe to invoke the factual proposal engine.” The latter requires original workflow-recorded hashes and same-run/workflow-SHA verification.
- Recovery-time hashes document current recovered bytes only; they cannot retroactively prove original artifact integrity.
- Synthetic handoff positive/negative tests passed in [run 38120577418](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120577418), 73 passed, 0 failed, 0 skipped.



## L-041 — Candidate envelopes need exact candidate identity at the consumer boundary

- The proposal engine previously required root-level sources and could not consume the authoritative candidates[] envelope. Supporting the envelope must not mean choosing the first candidate or guessing from source ID alone.
- It now requires exact candidateTitle and candidateLink with one unique match; missing/ambiguous identity blocks.
- End-to-end synthetic handoff remains proposal-only and non-mutating. CI: [run 38120828568](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38120828568), 77 passed, 0 failed, 0 skipped.


## L-042 — A provenance-completeness marker must reflect the actual bundle

- **Observed:** The quarantine workflow previously wrote `hashesRecordedInWorkflow: true` even if the claim report or canonical evidence pack was missing, leaving an empty hash value. The adapter failed closed, but the metadata marker overstated completeness.
- **Decision:** Default the marker to `false`; set it to `true` only when article, report, and evidence-pack hashes are all non-empty. Keep downstream byte/hash/run/SHA checks mandatory.
- **Validation:** Offline contract test [run 38121317875](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121317875) passed 77/77, 0 failed, 0 skipped. Publishing was not run.


## L-043 — Review evidence must be component-level and bundle-bound

- Exact artifact lineage and a passage ID establish traceability, not semantic support for every factual part of a replacement.
- The v1 review record binds reviewer, workflow run/SHA, article/report/evidence-pack hashes, proposal ID, claim/replacement and passage text. It records component assessments and checks scope, timing, attribution, and uncertainty.
- This remains advisory human judgment. Keep `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`, and all existing gates mandatory. Preserve separate records for disagreements.
- Offline contract tests are in `scripts/test-boat-semantic-support-review.mjs`; validator/CLI is the next step.

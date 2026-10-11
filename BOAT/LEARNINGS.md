# BOAT Learning Register

Keep verified observations separate from hypotheses. Each entry should include evidence and a validation status.

**ID integrity note (2026-10-11):** Historical entries had reused identifiers, which made references ambiguous. Headings have been renumbered uniquely in document order; the learning text and historical evidence are preserved. Validation labels such as “pending” describe the state at the time each entry was written, not the current branch-wide status. The latest published-lineage-manifest offline suite passed **129/129** in [run 38126927243](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126927243); Control Center checks passed 37/37 and production build passed in [run 38126992154](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992154). This does not prove semantic support or production readiness.

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


## L-044 — A review-record validator must enforce safety at the consumer boundary

- The review schema defines the record shape, but the CLI also independently pins `semanticSupport: not_verified`, `approvalRequired: true`, `automaticApplication: false`, and `existingGatesStillRequired: true`.
- The validator is read-only, prints a JSON result, and returns non-zero on invalid records; it does not write reviews or article bytes. Its tests cover malformed bundle hashes, reviewer/timestamp fields, passage evidence, extra properties, and unsafe constants.
- Validation: branch-head offline CI [run 38121699251](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121699251) passed 92/92, 0 failed, 0 skipped. The next audit should scrutinize timestamp edge cases and the scope of supported schema keywords.


## L-045 — Keep the validator honest about schema coverage and timestamp validity

- A schema validator can silently drift if the schema gains keywords that its custom implementation ignores. Recursively inventory the checked-in schema's keywords and fail tests for any unsupported keyword.
- Date parsing alone may normalize impossible calendar dates; validate calendar components and clock ranges explicitly. URI-format validation should check absolute URI syntax rather than impose an undocumented hostname rule.
- Validation: offline CI [run 38121806369](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38121806369) passed 94/94, 0 failed, 0 skipped.


## L-046 — Review disagreement needs identity rules, not an automatic winner

- Repeated `reviewId` values are blocking even if records look identical; do not silently deduplicate or pick a canonical record. If the same ID has different contents, preserve both and resolve identity explicitly.
- Compare reviews only when their exact workflow/artifact bundle, proposal, claim, replacement, source, and passage match. Invalid records and colliding IDs cannot establish agreement or disagreement.
- Different verdicts from distinct reviewers require human resolution; same-reviewer repeats are not independent evidence. Matching verdicts are descriptive agreement only. Never majority-vote, average, choose latest, or synthesize an aggregate verdict.
- The read-only review-set audit emits a SHA-256 subject fingerprint instead of repeating raw claim/passage text. Validation: branch-head offline CI [run 38122117534](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122117534) passed 106/106, 0 failed, 0 skipped. Next: add deterministic report fixtures and output-stability tests.


## L-047 — Deterministic summaries must not reorder source records or erase dissent

- Golden tests cover duplicate IDs, independent disagreement, same-reviewer disagreement/repeats, and invalid records.
- For permutation stability, compare canonicalized order-insensitive findings and verdict summaries, but preserve the original source order in the report's `records` array. Do not sort or drop raw records just to make reports look identical.
- Keep all distinct verdicts visible, `aggregateVerdict: null`, and `automaticAdjudication: false`; the audit is descriptive and does not decide truth.
- Added fixture and golden-test paths to offline CI. Branch-head validation is pending inspection; no provider or publishing workflow was run.


## L-048 — Compare permutation-stable summaries separately from source order

- A permutation test must not require the full report to be byte-identical when record order and input-relative indices intentionally preserve caller order.
- Compare order-insensitive findings/verdict summaries canonically, then independently assert that report records retain input order and every dissenting verdict survives. Golden invalid fixtures should reflect the validator's actual complete error list rather than assume one error per unsafe record.
- First CI run [38122385425](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122385425) passed 111/113; harness expectations corrected, follow-up CI pending. No production audit logic changed.


### L-048 validation update — golden tests verified

- Follow-up CI [run 38122442789](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122442789) passed **113/113**, 0 failed, 0 skipped.
- Golden cases verify duplicate-ID collisions, independent reviewer dissent, same-reviewer repeats/disagreement, invalid-record exclusion, source order, and absence of automatic winners. This confirms the tested offline contract only; semantic support remains unverified and existing gates remain mandatory.


- Final branch-head validation after fixture cleanup: [run 38122539254](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122539254) passed **113/113**, 0 failed, 0 skipped. The same-reviewer and independent-dissent distinctions, invalid-record handling, source order, and no-winner boundary remain covered.


## L-049 — Stable audit ordering and source order

- Sort report-level findings and subject groups by stable content/opaque fingerprints, and sort verdict arrays. Do not reorder the source `records` array to achieve deterministic output.
- Input-relative indices necessarily vary when input order changes. Exclude indices from the permutation comparison key but retain them in actual output so findings still refer to the caller's positions.
- Multi-subject permutation coverage passed in [run 38122708610](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38122708610): **114/114 passed**, 0 failed, 0 skipped. Dissent remains visible and no aggregate winner is produced.


## L-050 — Make diagnostic report boundaries explicit in schema

- A review-set report schema should describe both the normal audit and invalid-input envelope, preserve caller-order record indices, and list all diagnostic finding types without implying a truth verdict.
- Lock `aggregateVerdict` to null and `automaticAdjudication` to false in subject groups. Schema contract tests passed in offline CI run 38122850780: 120/120, 0 failures, 0 skips.


## L-051 — Validate emitted reports, not only schema declarations

- Property-presence checks are insufficient. Validate generated output structurally and test invalid types, required fields, enums, patterns, extra fields, and fixed safety constants.
- Malformed source identity types should not leak into typed report fields; keep the record ineligible and retain validation errors. CI run 38123099695 passed 123/123 tests, no failures or skips.


## L-052 — Bind handoff to the artifact's expected workflow state

- Matching hashes and run identifiers are necessary but not sufficient when a workflow artifact has a specific lifecycle state. The proposal handoff must also require the exact `claim-verification-blocked` status that the hash-recording workflow path emits.
- Add a negative regression where hashes, workflow run, workflow SHA, and metadata integrity match but the status is `generated-pending-verification`; the handoff must remain blocked.
- Safety review found this as a defense-in-depth omission, not a confirmed production bypass. CI run [38123444976](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123444976) was queued and must be checked before verification is claimed.


**Verification update for L-052:** Offline CI [run 38123484401](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123484401) passed 124/124 tests, 0 failures, 0 skips, including the negative non-blocked-status handoff regression.


## L-053 — Validate artifact lifecycle state as well as identity

- Matching run IDs and workflow SHAs are not sufficient if recovered artifact metadata claims the wrong lifecycle state. Require both the expected generated-pending and claim-verification-blocked statuses; test each mismatch independently. CI run [38123747483](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123747483) passed 126/126.

## L-054 — Evidence URLs should use explicit web schemes

- An absolute URI is not necessarily a safe web source URL. For semantic-support review records, accept only HTTP/HTTPS source links and reject executable/local/other schemes. CI run [38123791630](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38123791630) passed 127/127.

## L-055 — Every test in the test glob also needs a CI trigger path

- A test being included in `node --test scripts/test-boat-*.mjs` does not guarantee its edits trigger the workflow; the `pull_request.paths` filter must also cover it.
- Cross-check changed test filenames against explicit path filters. Added `scripts/test-boat-semantic-support-review.mjs` to the workflow allowlist; verify final branch-head CI before closing review.

## L-056 — Record final review evidence without overstating what it proves

- The final offline suite run [38124374037](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38124374037) passed 127/127 tests with no failures or skips. This proves the current offline regression suite passes; it does not prove article claims are semantically true or publication is safe for every future run.
- Review the quarantine hash-recording patch separately from running it: the workflow records all-three-artifact hash provenance only when the article, claim report, and evidence pack are present, then removes the blocked article from the publication set. No production publishing workflow was run.

## L-057 — Foundation tests are not product completion

- Passing offline schemas and validators proves those contracts, not that a user can chat with BOAT, audit every published article, browse public sources, approve changes, or observe learning outcomes.
- Track progress against end-user acceptance criteria and a working vertical slice, not only the number of validation modules or passing tests.
- When foundation work starts to crowd out product capabilities, stop adding adjacent validators and build the smallest safe end-to-end user workflow next.


## L-058 — A useful Control Center slice must show real data and its limits

- Static-export constraints make browser-only privileged actions inappropriate; do not label a mock chat as a working BOAT runtime.
- A build-time article inventory is a concrete first user-facing capability if the UI clearly distinguishes structural signals from semantic claim verification and calls out missing inputs as unknown.
- Keep scanner behavior deterministic and read-only, test it with synthetic clean/flagged articles, and make changes to the offline workflow path filters so tests actually trigger. CI/build verification remains pending until the branch result is inspected.


### L-058 verification update

- The new structural catalogue scanner fixture suite passed as part of offline CI [38125272757](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125272757): 128/128 tests passed; Control Center contract checks passed 33/33.
- Dedicated Control Center QA [38125272747](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125272747) passed the Next.js static production build despite existing non-fatal webpack cache/CSS warnings.
- These tests/build prove implementation and compilation only, not semantic fact-checking or a live BOAT backend.


- When switching the catalogue scanner from raw Markdown files to the canonical published article index, CI caught a stale `file` property reference. Fix the UI to use the canonical article `slug` and rerun the production build before marking it complete.


- The canonical article-index fix was verified by CI: 128/128 offline tests and 33/33 Control Center checks passed in [run 38125516855](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125516855); the production build compiled successfully in [run 38125516938](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125516938).


### L-059 — Historical claim report coverage is not current-version verification

- Path matching can reveal which published articles have archived claim-verification history, but it cannot prove that the report belongs to the exact bytes currently published.
- Keep historical PASS, historical block, conflicting history, and unknown as separate states; never select a winner from conflicting attempts or call missing data clean.
- Exact current audit requires a publish-time manifest with article SHA-256, claim-report SHA-256, evidence-pack SHA-256, workflow run/SHA, and a verifiable binding to the published slug. Tests/build passed in runs [38125733728](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125733728) and [38125733739](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38125733739).


## L-060 — A lineage manifest must bind exact bytes and current-run identity
- **Observed:** Historical claim-report coverage currently matches reports to published articles by `articlePath`; this cannot prove the report belongs to the exact current published bytes. The current workflow already uses `data/current-run-article.json` to distinguish an article generated in the current run, and the claim verifier writes an `articlePath`-scoped report.
- **Decision:** A lineage record must hash the exact article, report, evidence-pack, brief, and current-run marker bytes; bind the canonical article path to the same workflow run/SHA; require claim-verification PASS and a unique evidence-pack candidate matching the current brief; and fail closed on missing/ambiguous inputs.
- **Safety limit:** Hash binding establishes byte identity/provenance, not semantic support, source freshness, or universal factual correctness. Do not call a historical PASS current verification without a matching manifest.
- **Implementation status:** Offline manifest builder and synthetic tests added on the BOAT branch; offline CI verified **129/129** in [run 38126927243](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126927243). Control Center checks passed 37/37 and production build passed in [run 38126992154](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992154). It is not yet connected to the production publishing workflow. No provider/publishing run or article mutation occurred.
- **Next validation:** confirm the production-build result and compare the contract against actual workflow output shapes before integration.


- **Final branch-head verification:** offline suite [run 38126992293](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992293) passed 129/129; Control Center QA [run 38126992154](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38126992154) passed 37/37 and production build/export succeeded. The publishing workflow was not run.


## L-061 — Validate provenance helpers against production data contracts, not invented fixtures
- **Observed:** The current-run marker is written by `scripts/generate-article-adaptive.mjs`; the claim verifier writes a v18 report with `articlePath`, `articleTitle`, `claimCount`, `pass`, and `claims`; the evidence artifact envelope is assembled by `scripts/pre-writer-pipeline.mjs` as `{version:1,status:'authoritative',candidates:[...]}`.
- **Failure found:** The initial lineage builder did not fully validate the envelope/canonical pack shape and did not compare marker brief title and report article title/count to the exact article/brief bytes.
- **Decision:** Use the repository's `validateAuthoritativeEvidencePack` validator and require consistent marker, article frontmatter, brief, claim report, and evidence-pack candidate identity. Synthetic tests must represent the real schema and test malformed envelopes, duplicate candidates, and invalid packs.
- **Validation status:** Corrected code/tests are on the BOAT branch; latest CI pending. Earlier 129/129 tests validated the earlier contract, not this new correction. No publishing/provider run, article mutation, or `main` edit occurred.
- **Next:** inspect new offline CI and Control Center QA; only then consider a separately tested publish-time integration.


## L-062 — Provenance capture must be diagnostic and non-blocking until proven stable
- **Design:** The publish-time writer creates a run-specific immutable manifest only for a same-run generated article whose claim report is PASS and whose evidence pack matches the repository's canonical schema. It hashes the exact marker, article, report, evidence-pack envelope, and brief bytes.
- **Safety:** No-article is a clean no-op; missing/mismatched inputs or non-PASS reports produce no manifest. Existing manifest files cannot be overwritten. The workflow step is `continue-on-error: true` and does not replace or relax publication gates.
- **Persistence:** The manifest sits under `data/published-lineage/`, which is included by the existing `git add data` step. It will only be committed if later build/output commit steps succeed.
- **Validation status:** Writer, CLI tests, and workflow wiring have been added; branch-head CI is pending. Earlier test failure was a test-expectation mismatch and was corrected. No publishing workflow/provider call/article mutation/`main` change occurred.
- **Next:** verify offline tests and Control Center build; review exact diff before treating the integration as complete.


## L-063 — Update paired TypeScript declarations when extending an MJS module
- **Observed:** The JavaScript lineage-audit export existed and its offline tests passed, but the Next.js production build failed with “no exported member” because the paired `.d.mts` declaration did not expose the new function at that commit.
- **Fix:** Add the public function and return-state types to `scripts/boat-published-catalogue-audit.d.mts` alongside the MJS implementation.
- **Validation:** 130/130 offline tests passed before the declaration change. The new branch-head offline and Control Center QA runs are pending; do not mark complete until production build is green.
- **Next:** inspect both latest CI runs and then review the end-to-end manifest persistence/dash state.


## 2026-10-11 — CI and workflow review lesson
- The latest branch-head BOAT offline suite and Control Center QA/production build passed (runs 38127688568 and 38127688585).
- A passing build does not prove a publishing workflow actually writes a manifest. Code inspection shows the lineage writer is non-blocking and the data/ directory is staged by the output commit step, but production persistence has not been exercised. Test this contract offline rather than spending provider/image quota or dispatching production publishing.
- Exact-byte lineage is provenance, not semantic support or source freshness. Keep UI wording narrow and unknown/stale states visible.
- GitHub compare reports the PR branch is 5 commits behind main; avoid blind merge/rebase. Inspect divergence and diff before declaring merge readiness.


## L-064 — A workflow contract test is not a production persistence proof
- **Observed:** BOAT Offline Tests and Control Center QA/production build both pass at branch head `932d5878a8cd4cd4025ccc89954a716d28af020f` (runs [38128016828](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128016828), [38128016780](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128016780)).
- **Verified in code:** the adaptive generator creates a current-run marker; lineage capture runs after the SEO gate and before build; the existing output commit stages and transfers `data/`.
- **Limit:** the new regression test statically checks workflow wiring. Because production publishing was not run, no claim can be made that a real manifest was created or persisted to the deployed branch.
- **Divergence:** main has five generated-intelligence data refresh commits beyond the merge base. The PR branch's 454-commit ahead count includes old history and must not be interpreted as 454 new BOAT changes. Do not merge/rebase blindly.
- **Rule:** distinguish static workflow contract, offline CLI behavior, and actual production persistence as three separate evidence levels. Exact-byte lineage is not semantic verification.


## L-065 — Keep workflow-contract regexes valid and narrow
- **Observed:** The first path-specific test assertions failed because regex escaping produced an invalid regex literal; the failure was isolated to the test file, not the publishing workflow.
- **Correction:** Normalized regex literals and reran CI. BOAT Offline Tests [38128203466](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128203466) and Control Center QA/production build [38128203447](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128203447) both passed.
- **Rule:** Keep test assertions path-specific but validate the test itself through CI; do not infer production persistence from static assertions alone.
- **Next:** Final changed-file intersection review; keep PR draft/unmerged until deliberate integration review is complete.


## L-066 — Test the auditor against the real published catalogue
- **Change:** Added an offline CLI and integration test over `lib/articles.ts`, not only synthetic fixtures. The report includes per-article structural findings, duplicate slugs, consistent counts, and limitations.
- **Failure caught:** The first CI run detected a literal backslash-n appended after JSON, which made stdout invalid JSON. The CLI was corrected to append an actual newline; latest offline run [38128438403](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38128438403) passed.
- **Boundary:** This improves structural inventory coverage; it is not semantic claim verification and does not prove source freshness/reachability. No article changes, publishing workflow, or paid-provider calls.
## L-067 — Unify review signals without manufacturing a factual verdict

- **Need:** Structural flags, archived claim-report outcomes, and exact-byte lineage are separate views. A human reviewer needs one per-article queue, but combining them must not upgrade provenance into semantic truth.
- **Decision:** Combine the existing three audits into a read-only triage report. Preserve `unknown`, stale manifests, historical blocks, conflicting outcomes, and duplicate slug ambiguity. Priority is only work ordering; every item remains `needs-human-review`, including articles with a current-byte manifest match.
- **Guardrail:** No public-web fetch, article mutation, repair execution, or publishing decision. Exact-byte lineage is provenance only; archived PASS is not current verification.
- **Validation:** Added synthetic status/priority assertions and a CLI integration test against the real canonical article index. Branch-head CI must be inspected before this learning is marked verified.

## L-068 — Claim-level history must retain artifact uncertainty

- **Need:** A published-article triage queue must expose individual claim/source/passage records instead of only article-level counts.
- **Decision:** Read archived verifier reports and preserve all attempts, claim outcomes, source identifiers/URLs/roles, passage IDs, excerpts, run metadata, and current-text match diagnostics. Do not infer missing source context or choose the latest report as the truth.
- **Limits:** Historical PASS is not current verification; source fields and passage IDs are saved metadata until independently resolved; text non-match is not proof of a false or absent claim. This tool does not fetch web sources, run providers, generate repairs, or mutate articles.
- **Validation:** Added synthetic conflict/unknown cases and an integration test against the canonical published catalogue. Wait for branch-head offline and Control Center CI before marking the implementation verified.

### L-068 validation note — distinguish absent report from absent article

- CI exposed that the synthetic “no archived report” case also lacked the current Markdown file, correctly causing the stronger `unknown-current-article-missing` state. Add the article fixture rather than weakening the implementation's UNKNOWN precedence.
- Inspecting the actual root data revealed a single root claim-verification snapshot mapped to a published slug. Include it as a distinct `root-workflow-snapshot`, but do not treat it as exact-current-byte verification without hash-bound lineage.
- The corrected fixture and root-snapshot coverage are pending branch-head CI.

## 2026-10-11 — Canonical pack content retrieval correction

**Correction:** the current root `data/authoritative-evidence-pack.json` is not empty. A helper returned an empty content field for this large file; reading the raw GitHub contents response showed valid JSON (~3.46 MB) with 24 candidates. The Amazon/Nvidia brief matches exactly one candidate with two sources. The root pack and archived attempt pack have the same Git blob SHA, and archive metadata ties the article path and pack to run `38106429274`.

**Remaining gap:** the attempt archive metadata does not contain the claim-report hash or report run ID. Therefore the article+pack run linkage can be checked, but the claim report's exact run binding remains UNKNOWN. Source/passage/fact ID matches are structural traceability only; semantic support and source freshness remain unassessed. Never manufacture evidence or infer a report hash.

**Validation:** the audit was updated to understand the real `{version,status,candidates}` envelope, match the candidate through `data/article-brief.json`, and resolve `Sx-Pn`, body anchors, and `Sx-FFn` fact anchors. Latest-head CI is pending.

**Test harness lesson (2026-10-11):** when generating source through a string template, newline escaping can accidentally write the two characters `\\` and `n` into a CLI output expression. Test the real CLI stdout as JSON in CI; do not count module-level assertions alone as end-to-end validation. Fix commit: `b70032893c8f9108f8d523e44f917ba8f1be2b37`; latest-head CI is still required.

## 2026-10-11 — Exact artifact pairing outranks local ID resemblance

Offline run [38129695590](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38129695590) passed 135/135 tests at `e1146ef18c67be057f4d73893df395b9fdc5fedf`. Even when a supplied pack contains matching local source/passage IDs, the root-snapshot audit must not mark lineage resolved unless report-pack pairing is proven with exact metadata/hash binding. Record local matches as diagnostics, keep `unknown-pack-binding`, and leave semantic support `not_assessed`. Also avoid tests whose assertions assume a shared root artifact cannot be temporarily rewritten by another concurrently running test; use synthetic inputs for deterministic assertions. The latest test-message-only commit is pending CI.

## 2026-10-11 — Never test shared generated artifacts as immutable fixtures

A live CLI test and GitHub file-content fetch misleadingly suggested the root evidence pack was zero bytes. Direct Git blob retrieval disproved this: the file is a multi-megabyte JSON document with 24 candidates, and the root/archive copies at the historical output commit share a blob SHA. Keep end-to-end tests on a private temporary root via `BOAT_AUDIT_ROOT` because shared root data can change under parallel tests. Mirror the canonical schema (`candidates[]`, `evidenceBrief.relevantPassages`, `storyFactMap.coreFacts`). Keep report/run binding UNKNOWN until the exact claim-report hash is tied to the same run.

## 2026-10-11 — Large-file retrieval versus missing lineage

**Correction:** an empty `content` field from a GitHub file-content wrapper is not proof that a large JSON blob is empty. Check commit diff statistics and retrieve the Git blob directly before diagnosing storage failure. In the Amazon/Nvidia run, the canonical pack was generated and archived; the root and archived pack blobs matched exactly. The actual gap is that the historical workflow did not persist a same-run lineage manifest containing the claim-report hash. Structural ID/URL resolution is useful traceability, not semantic proof.

## 2026-10-11 — Latest verification

At head `53e856e41751c44bc3f65d59ccca7ceb781740f7`, offline run [38130573836](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130573836) passed 136/136 tests; Control Center QA [38130573818](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130573818) passed the production build. The live root audit resolves source IDs and URLs but keeps report/run pairing UNKNOWN without a same-run claim-report hash manifest. Do not turn structural matches into factual-support PASS.

## 2026-10-11 — Archive the final verification, not just the generated draft

The existing archive step runs immediately after article generation, before claim verification and any repair. It therefore captures the initial draft and pack but not the final claim report, leaving report/run pairing unproven. The remedy is an additional post-verification immutable finalized bundle containing the final article bytes, canonical pack bytes, claim report bytes, all three hashes, and workflow run/SHA. Keep the original attempt for repair history; never overwrite conflicts; keep the step non-blocking and leave UNKNOWN when exact matching fails.

Offline run [38130627939](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130627939) passed 136/136 tests. Historical run 493 cannot be retroactively bound from the archive alone; the next normal production run is the first real end-to-end validation of the new persistence path. Exact workflow SHA matching was tightened afterward and needs latest-head CI.

## 2026-10-11 — Test regex escaping can mimic a workflow regression

When a source file is generated or edited through API strings, regex literals can accidentally retain two backslashes. `/\\s/` matches a literal backslash plus `s`, while `/\s/` matches whitespace. Inspect the actual checked-in source and failing assertion before changing a workflow that may already be correct. The lineage binder remains non-blocking; do not weaken the publication gate to compensate for a broken test. Latest run emitted `fail 0`, awaiting terminal status.

## 2026-10-11 — Bind the final report, not just the pre-verification draft

The attempt archive is created before claim verification/repair, so its article bytes can legitimately differ from the final published article. A pack-only archive match is not enough to prove which report was verified. Added a non-blocking finalization step that stores the final article, canonical pack, and final claim report together with exact SHA-256 hashes and workflow run/SHA metadata in a separate immutable attempt bundle. The root auditor now accepts report/run binding only when these exact hashes and bytes match, or when an equivalent lineage manifest matches.

**Safety:** identical bundles are idempotent; mismatched existing bundles are preserved; no article is repaired or publication blocked by the binder. Offline run [38130780216](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38130780216) passed 136/136 tests. Historical run `38106429274` predates the binder, so its report/run binding remains UNKNOWN; do not backfill from inference.

## 2026-10-11 — Distinguish runtime generation from persisted root snapshots

A zero-byte tracked `data/authoritative-evidence-pack.json` does not prove the generator failed. Successful production run 493's uploaded run-scoped artifact contained a valid 3.47 MB pack with 24 candidates, and the same artifact contained the 10-claim saved PASS report. The missing invariant is exact immutable binding in attempt metadata (article SHA, report SHA and pack SHA), which the branch binder is intended to add. Inspect run-scoped artifacts before diagnosing runtime generation; never copy an artifact from another run into root data or treat saved `pass: true` as independent proof of factual correctness.

## 2026-10-11 — Bind all three bytes, not just article and evidence pack

An article and evidence-pack hash bound to a run still cannot prove which verifier report belongs to that run. Archive the exact claim-report bytes and record `claimReportSha256` with `articleSha256`, `evidencePackSha256`, `workflowRun`, and `workflowSha`. Require exact same-run matching; fail closed on duplicate/missing/mismatched archives. If a failed article is quarantined before metadata binding, read the archived article bytes only—never restore it into the publication set. Even complete byte lineage proves provenance, not semantic claim support or source freshness.

## 2026-10-11 — Verification before assuming production lineage works

The binder's isolated regression suite passed at code head `494764f5788aa17877e48e7a15b51390d7fc099f`; the full BOAT suite was **136/136**, and Control Center deterministic checks plus production build passed. A synthetic fixture proves code behavior, not that a real scheduled run produced the expected archive. Confirm the next naturally occurring run's `data/article-attempts/<run>/metadata.json` and exact archived `claim-verification.json` hashes before upgrading the live status from UNKNOWN.

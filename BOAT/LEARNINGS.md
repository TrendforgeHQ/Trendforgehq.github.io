## L-NEW — Store-backed resume must treat portable task JSON as a cache, not authority

- **Observation:** A valid but stale task JSON artifact can disagree with the unified task store after interruption. If resume trusts the artifact, it may rewind a cursor and redo already completed work.
- **Decision:** In explicit `--task-store` mode, load task identity, status, findings, and checkpoint from the canonical store. Rewrite the task JSON snapshot from that record. If the store does not contain the requested task, fail closed rather than importing artifact state.
- **Idempotency:** Skip article units already recorded in `checkpoint.completedUnits`; deterministic finding IDs plus task-state deduplication protect against duplicate findings. Reports are rewritten to a stable task path rather than appended.
- **Validation:** [Run 38229900046](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38229900046) passed 186/186 offline tests and the read-only published-root lineage audit. Integration fixture simulated a running task after interruption and an intentionally stale artifact; only remaining articles were processed.
- **Limitations:** The store is local to a retained workspace. This does not prove persistence across ephemeral hosted runners or provide a multi-process lease. The manual workflow remains unchanged until a separately validated portable-store/artifact design exists.

---

## L-NEW — Atomic store updates must support batched logical transitions

- **Observed:** The catalogue worker may perform several in-memory state operations (for example, add findings and checkpoint units) before persisting one durable transaction. Requiring each store write to advance the task revision by exactly one rejected a valid batched update.
- **Fix:** `updateStoredTask()` requires the same task ID, a valid task record, and a task revision strictly newer than the persisted revision; the store lock and expected-revision check still reject stale writers.
- **Validation:** [Run 38228963259](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38228963259) passed 184/184 offline tests and the read-only published-root lineage audit. The first run [38228841380](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38228841380) exposed the over-strict revision rule and is retained as a failed validation, not hidden.
- **Limitation:** This primitive is not yet wired into `boat-run-catalogue-task.mjs`; no runner/store integration or hosted cross-run persistence is claimed.

---

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

## Evidence artifact retention — 2026-10-11

Updated the pipeline's downloadable diagnostics: the article-attempt artifact now explicitly includes `data/authoritative-evidence-pack.json`, and a separate run-scoped artifact uploads `data/published-lineage/manifest-${GITHUB_RUN_ID}.json` immediately after lineage capture and before the site build. Both uploads are non-blocking and warn when no file exists; this does not alter publication gating or claim factual correctness. Added workflow-contract assertions for the exact pack path, manifest run ID path, step order, and no-manifest behavior. PR CI is the validation target; production publishing was not dispatched. Next: verify latest offline suite and Control Center build, then inspect a real run's retained artifact once one is naturally produced.

## Verified production-run evidence gap — 2026-10-11

Read-only inspection of successful scheduled pipeline run [38106429274](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38106429274) confirms the archived attempt `20261011-025404-amazon-eyes-8-b-nvidia-chip-financing-to-lighten-ai-capital-load` has a **zero-byte** `authoritative-evidence-pack.json` (same empty blob SHA `23b5b53069351539853d02be1a1f4e08c44b017a` as root `data/authoritative-evidence-pack.json`). Its metadata identifies workflow run `38106429274` and source SHA `a16223ff72c997f516f0def895962554c79946c1`. The same attempt contains a non-empty brief and article. The run log shows `pre-writer-pipeline.mjs` completed and its source writes the canonical pack, so the checked-in empty pack is not merely a stale display issue: that particular attempt did not preserve evidence-pack bytes. Root claim report has 10 claims and saved `pass: true`, but cannot be independently bound to usable evidence from this empty pack.

Do not infer the precise truncation cause yet; inspect the successful run's artifact and all same-run pack writes in an isolated checkout before making a production-path fix. The PR now retains the canonical pack in downloadable attempt diagnostics and separately uploads the run-scoped lineage manifest. Workflow-contract and offline tests pass at the code revision; Control Center deterministic suite and production build also pass. Production workflow was not dispatched and PR remains unmerged.

## Artifact cross-check correction — 2026-10-11

Downloaded and inspected run `38106429274`'s retained artifact ZIP (`trendforge-article-attempt-493`, artifact ID `11689627673`). Important distinction: the **repository-committed** root and per-attempt evidence-pack blobs are zero bytes, but the **same run's downloadable artifact** contains a 3,470,280-byte attempt pack (SHA-256 `4bb88ac97cb81f7c6c4845c2e13c661822ad884a4a4c9050d441ee6a4716759d`) with 24 candidates; exactly one candidate title matches the archived brief. The artifact also contains the 10-claim saved report with `pass: true`. Thus runtime evidence did exist in the retained artifact, while Git-persisted pack bytes were lost/empty. The precise point where bytes disappear is still unproven; do not say the runtime pre-writer failed. Next compare the pipeline's first output commit with the post-reset transfer commit and add byte-count/SHA diagnostics around that transfer. The PR's new artifact uploads improve future retention but do not yet fix the observed Git-persistence discrepancy.

## Evidence-pack transfer observability — 2026-10-11

Implemented on the isolated PR branch: the pipeline output-commit step now logs the canonical evidence-pack worktree byte count, SHA-256 and Git blob ID before the first output commit; it then logs the committed blob ID/size, the post-transfer staged file bytes/hash/blob ID, and an explicit exact-match/mismatch/unknown result. These diagnostics are warnings/logs only and do not create a new publication gate. The observed artifact-vs-Git persistence discrepancy is still not explained; this change is intended to locate the exact stage in a naturally occurring scheduled run, not claim the fix is proven. No production run was dispatched.

Also added `scripts/boat-numeric-claim-coverage-audit.mjs` and its regression test to the BOAT offline workflow path filters, and expanded the workflow-contract regression test to assert both persistence checkpoints and those path filters. Latest-head offline CI and Control Center build are pending.

## 2026-10-11 — Test the actual transfer script, but do not overclaim production repair

The workflow-contract test caught a false assumption about the exact log string, then caught brittle shell-block extraction in the test itself. Corrected the assertions to match actual checkpoint calls and extracted the YAML shell block via its `run: |` marker; added a `bash -n` syntax check so malformed transfer shell is caught in offline CI. On implementation revision `70a128b895ca719060e700b5f3a36f25ef1d13c1`, BOAT offline suite passed 137/137 and Control Center build passed. This proves test/workflow contract consistency only. The actual zero-byte committed pack vs non-empty retained artifact discrepancy still requires diagnostics from a future naturally scheduled run; no production run was manually triggered.


## L-019 — A static Control Center cannot be the privileged BOAT runtime
- **Observed:** `next.config.mjs` sets `output: 'export'`; `app/control-center/page.tsx` reads committed JSON snapshots at build time. The publishing workflow has provider secrets and write permissions, so it is not a safe arbitrary browser-command endpoint.
- **Decision:** Keep GitHub Pages as the presentation layer. A real conversational task interface requires a separately authenticated backend and a least-privilege worker. Never ship a GitHub token/provider key in client code or present a client-only echo as a real bot response.
- **First implementation scope:** read-only published-catalogue audit task, durable task states/history, pinned commit provenance, explicit unknown/blocked states, bounded/idempotent requests, and zero paid-provider budget.
- **Safety boundary:** no article mutation, publish dispatch, merge, or gate changes in the first slice. Approval for later repairs must be server-verified and bound to an immutable proposal hash.
- **Evidence:** interface audit in `BOAT/CONTROL_CENTER_INTERFACE_AUDIT.md`; existing PR #35 branch-head checks passed in runs 38136303910 and 38136303936. Those checks do not validate a backend, which is not yet implemented.

## L-020 — Verify the new branch, not just its parent baseline
- **Observed:** PR #35's prior branch-head checks were green, but a separate audit PR still needed its own CI result before being called validated.
- **Decision:** Record PR #37's own run 38219593540 as the verification result. It passed the existing offline workflow, including 37/37 Control Center deterministic checks and the read-only root-lineage audit.
- **Limitation:** These tests do not exercise a live backend, authentication, task persistence, or a chat interface. Those capabilities remain unimplemented.
- **Constraint:** GitHub Pages remains the free static frontend; no external backend/identity service has been selected. Verify a free-tier server-side option and its security properties before implementation.


## L-NEW — Quota resilience requires resumable work, not just provider fallback
- **Observed:** The current deployment is a static GitHub Pages export; BOAT has deterministic offline audit scripts, while live task submission and durable shared task history are not implemented.
- **Decision:** Keep the core task contract, audit rules, state format, checkpoints, and report generation owned by the repository. Treat AI, external retrieval, hosted storage, and hosted authentication as optional adapters rather than prerequisites for deterministic audits.
- **Implication:** Provider failover alone does not solve quota interruptions. Tasks must checkpoint completed units, resume idempotently, and preserve partial results when a network/provider budget is exhausted.
- **Limit:** GitHub Actions also has usage limits, and workflow artifacts can expire. This design reduces lock-in and wasted work; it does not promise unlimited free compute or permanent artifact retention.
- **Validation status:** Architecture decision documented; task-state implementation and its tests are pending.


## L-NEW — Portable task state can reduce repeated work, but does not itself create intelligence
- **Observed:** A repository-owned task-state module now defines task identity, explicit transitions, checkpoints, idempotent finding IDs, budget counters, and local persistence without a third-party runtime package.
- **Implication:** The next step is to integrate existing read-only audit logic and prove resume behavior end to end; the state module alone is not a worker, model, or live Control Center backend.
- **Risk:** File locks can remain after a process crash. The implementation intentionally fails closed on an existing lock instead of deleting it automatically; recovery needs explicit operator action.
- **Validation status:** Tests authored and wired into the offline test glob; CI result pending at the time of this entry.


## L-NEW — A resumable audit must pin both input revision and task configuration
- **Observed:** The read-only catalogue task runner accepts an explicit full commit SHA and batch size, persists a cursor after each batch, and refuses to resume if the commit, task type, catalogue size, or batch configuration differs.
- **Implication:** Checkpoints are safe only when the input revision and the interpretation/configuration of the task are stable; otherwise old progress can be misapplied to new inputs.
- **Limit:** This runner's output is a deterministic structural review signal, not semantic fact verification. AI and web budgets remain zero in this implementation.
- **Validation status:** Integration tests authored; current commit CI pending.


## L-NEW — User-supplied commit strings are not provenance by themselves
- **Observed:** The first task runner accepted a full SHA argument but did not prove that the current checkout matched it.
- **Correction:** The runner now compares the supplied SHA with `git rev-parse HEAD` before reading or creating task state, and resume also checks the stored task pin.
- **Implication:** Provenance requires binding the task to the actual bytes being audited, not merely storing a syntactically valid commit identifier.
- **Validation status:** Corrective test authored; next CI run pending.


## L-NEW — First resumable worker validation is green, with scope limits
- **Observed:** BOAT Offline Tests run 38221034281 succeeded; the task-state suite and three catalogue task integration tests passed.
- **Verified behavior:** bounded batch pauses, saved checkpoint resumes to completion, repeat resume is idempotent, and mismatched commit/configuration is rejected.
- **Limit:** This proves deterministic structural task execution only. It does not verify semantic claim support, source freshness, or live Control Center authentication/task submission.
- **Validation status:** CI verified for the code implementation in the PR merge checkout.


## L-NEW — Provenance guard plus resumability tests are now green
- **Observed:** Run 38221180437 passed after the runner was hardened to compare the supplied commit to the checked-out SHA and reject dirty tracked audit inputs.
- **Verified:** pause/resume, repeated completed-task resume, zero AI/web counters, and pinned-input/config mismatch checks passed in the integration suite.
- **Limit:** The green suite verifies deterministic structural review only; it does not prove semantic claim support, source freshness, or a live authenticated Control Center.
- **Validation status:** Verified by the linked BOAT Offline Tests run.


## L-NEW — A combined review queue must preserve historical provenance and semantic uncertainty
- **Observed:** Existing BOAT code can combine structural checks, archived evidence coverage, exact-byte lineage, and archived claim-verifier report diagnostics without new network/model calls.
- **Decision:** The resumable task records these as separate review signals; it preserves report IDs/hashes, saved claim statuses, source/passage fields, and current-text-match diagnostics.
- **Safety:** All claim findings explicitly remain `not_assessed` or `unknown`; an old verifier PASS is not current factual verification. Findings are proposal/review signals, never repair authorization.
- **Compatibility:** Audit-profile version 2 prevents an older structural-only task from being resumed with new output semantics.
- **Validation status:** Integration tests authored; current commit CI pending.


## L-NEW — Zero findings in a batch is a valid audit outcome
- **Observed:** The first combined-review CI run failed because a test expected structural findings to exist in a specific early batch. The underlying combined-audit safety test passed; structural checks may legitimately return no findings for a batch.
- **Correction:** Test category-count reconciliation and explicit no-auto-repair/no-auto-publication flags instead of assuming a finding category must be non-empty.
- **Validation status:** Corrective test and summary metadata are committed; CI pending.


## L-NEW — Findings should carry exact current article identity without duplicate noise
- **Observed:** Combined review queue already reports duplicate slug identity per catalogue entry; the older standalone duplicate-slug block in the worker would add a redundant extra finding.
- **Correction:** Remove the redundant global duplicate signal and attach the current article SHA-256 to each archived claim-history finding, alongside the archived claim-report hash.
- **Validation status:** Combined integration baseline passed in run 38222968795; cleanup commit CI pending.


## L-NEW — Combined read-only review task is green; semantic review remains separate
- **Observed:** BOAT Offline Tests run 38223070482 passed after combining existing structural, historical evidence, exact-byte lineage, review-queue, and archived claim-history modules into one resumable task.
- **Verified:** The task pauses/resumes; category totals reconcile; findings preserve article/report provenance; no automatic repair or publication decision is enabled.
- **Limit:** This is historical/structural triage. It does not independently validate source content, freshness, reachability, or factual truth. Live Control Center authentication/task submission remains unimplemented.
- **Next:** Generate a portable, deterministic human-readable report from the saved task record before adding live backend/UI connectivity.


## L-NEW — Persisted findings need a human-readable artifact as well as machine state
- **Observed:** The combined task record is machine-readable JSON, but a reviewer should not have to inspect raw JSON to understand findings and their limitations.
- **Decision:** Generate a deterministic Markdown sibling report from the saved record after each checkpoint; keep JSON canonical and Markdown a derived view.
- **Safety:** Report renderer makes no network/AI calls, escapes untrusted text for Markdown tables/inline code, and refuses to overwrite the state JSON. It prominently says historical PASS and provenance do not prove current truth.
- **Compatibility:** Task profile v3 stores audit-component summary in task identity/config and blocks resume when the recomputed component summary differs.
- **Validation status:** Tests authored; CI pending.


## L-NEW — Canonical task config needs canonical equality checks on resume
- **Observed:** The task-state factory canonicalizes nested config keys. Comparing the stored audit summary with insertion-order JSON could reject an otherwise identical resumed task.
- **Correction:** Compare both values through the same recursive canonicalization before resuming.
- **Security note:** Human-readable reports must escape untrusted article/claim text so content cannot inject HTML/Markdown structure into the review artifact.
- **Validation status:** Regression tests authored; CI pending.


## L-NEW — Imported utility modules must not execute their CLI entrypoint
- **Observed:** Importing the report renderer from the task worker invoked its CLI against the worker's arguments, causing task execution to fail before report writing.
- **Correction:** Guard CLI execution by comparing the invoked script path with the module URL; keep renderer/writer exports side-effect-free.
- **Related fixes:** Use Node fs/promises methods directly and render machine statuses as readable labels.
- **Validation status:** CI fix pending.


## L-NEW — Derived human reports should be reproducible and never become the source of truth
- **Observed:** A Markdown task report can be generated deterministically from the canonical JSON task state and refreshed after each checkpoint.
- **Verified:** Run 38223584210 passed tests for deterministic output, escaping, provenance, CLI output, and refusing to overwrite task JSON.
- **Decision:** JSON remains canonical; Markdown is a derived reviewer-facing artifact. Reports state uncertainty and that historical PASS/provenance is not current fact verification.
- **Limit:** This improves reviewability but does not create live Control Center authentication or semantic verification.


## L-NEW — A manual worker can expose BOAT without coupling it to publishing
- **Decision:** Use a dedicated `workflow_dispatch`-only workflow with read-only repository/action permissions to run the deterministic BOAT audit and upload portable task state/report artifacts.
- **Resume contract:** A paused task can resume only when the task ID, prior workflow run ID, and exact original commit SHA are supplied. Artifact expiry or unavailable history blocks resume; it does not silently restart under new inputs.
- **Safety:** No push/PR/schedule trigger, no write permissions, no provider secrets, no publishing dispatch, and checkout credentials disabled.
- **Validation status:** Static workflow safety tests authored; CI pending. Workflow has not been manually dispatched.


## L-NEW — Validate generated workflow syntax, not just intended YAML source
- **Observed:** Raw-template escaping left literal backslashes before GitHub Actions expressions in the first generated workflow file.
- **Correction:** Normalize expression markers before committing and add static workflow tests for manual-only triggers, read-only permissions, and artifact/resume wiring.
- **Validation status:** Current-head CI pending; workflow has not been manually dispatched.


## L-NEW — Resume artifacts must preserve the expected directory layout
- **Observed:** Combining task-state files with a summary file from a parent directory changes the upload artifact's common root and can nest task JSON under a subdirectory when downloaded.
- **Correction:** Upload checkpoint/report files separately from the summary so the checkpoint artifact's root contains the task JSON and Markdown files directly.
- **Recovery:** If the worker fails after saving a checkpoint but before emitting the normal summary, discover the task ID from the saved JSON and use it for the artifact name.
- **Validation status:** Workflow static test and offline CI pending.


## L-NEW — Static workflow safety tests do not prove cross-run artifact resume
- **Observed:** Run 38224116086 passed static workflow isolation/permission/artifact-layout tests plus task/report regression suites.
- **Verified:** The workflow definition has only a manual trigger, read-only contents/actions permissions, no persisted checkout credentials, and separate checkpoint/report versus summary artifacts.
- **Not yet verified:** A real manual dispatch, artifact upload/download between separate runs, and end-to-end resumed completion. The workflow was not dispatched as part of CI.
- **Next:** Controlled manual test, then inspect the produced report before any authenticated Control Center integration.


## 2026-10-12 — Security boundary lessons for Control Center

- A statically exported page can render committed audit snapshots but cannot securely host privileged credentials or enforce server-side authorization. A live task console requires a server-side broker; CORS or hidden UI controls are not authentication.
- GitHub Actions artifacts are expiring transport, not durable shared task history. Resume must bind task ID, prior run ID, artifact identity, pinned commit, task profile/config, and schema, and must fail closed on any mismatch.
- A green static workflow test is not proof of a manual dispatch or cross-run artifact resume. Keep that distinction explicit in project status and reports.
- Approval must bind to immutable proposal bytes and the base commit; any proposal/base/path/test change requires renewed approval. BOAT must never turn a historical verifier PASS into a current factual claim or dispatch the production publishing workflow.


## 2026-10-12 — Security boundary docs CI result

- BOAT Offline Tests [38224801135](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224801135) passed on `b060f4b58e470e49fb421fe3bb796e2745e20508`, including the existing offline regression suite and read-only published-root lineage audit.
- A documentation PR passing CI must not be confused with validation of a future live broker, authentication/session security, or manual workflow artifact round-trip.


## 2026-10-12 — Follow-up records validation

- The follow-up documentation record commit `89d530359996a1ef772896e72b7b5e3a803a387a` passed BOAT Offline Tests [38224894861](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224894861), including offline regression tests and the read-only lineage audit. This is still not evidence of live workflow dispatch or broker/authentication.


## 2026-10-12 — Checkpoint artifact provenance lessons

- A prior run ID supplied to artifact download is necessary but not enough for the task's own provenance contract. Bind the portable task JSON and derived Markdown report to an explicit manifest containing source run ID, task ID, pinned commit, profile/config hash, and exact-byte hashes; validate before resuming.
- Do not re-sign a failed or mismatched downloaded checkpoint under the current run ID. The workflow now creates the next manifest only if prior-manifest validation succeeded (or it is a new task).
- The first static-test run [38225209463](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38225209463) caught over-escaped regex assertions. Corrected them and verified the full offline suite in [38225314231](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38225314231).
- These checks improve provenance integrity but do not prove the Actions artifact round-trip works end-to-end; that still needs a controlled manual run after the dispatch/deployment gate is explicitly resolved.


## 2026-10-12 — Keep task authorization separate from client input

- The request body must not choose its repository, workflow, role, permissions, or budget ceilings. Those values must come from trusted server configuration/session context.
- A syntactically valid request is not an authorized request. Validate shape first, then apply a separate fail-closed authorization policy; fixed stable decision codes make denials testable.
- Start with a bounded read-only task allowlist and zero AI/web budget. Reject extra fields and unbounded requests instead of relying on UI controls.
- A pure authorization policy is not authentication: live integration still requires a reviewed server-side identity/session, CSRF/origin validation, rate limiting, and durable idempotency storage. Current work is offline contract/testing only; CI is pending.


## 2026-10-12 — Contract CI evidence and limits

- BOAT Offline Tests [38226609696](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38226609696) passed 168/168 tests and the read-only published-root lineage audit.
- This establishes that the repository-owned request/response validator and pure authorization decision policy satisfy their current offline tests. It does not establish identity verification, CSRF middleware, durable replay prevention, actual workflow submission, or a secure live broker.
- The JSON Schema check currently parses the schema files and compares important values with runtime rules; it is not a full JSON Schema validator.

## 2026-10-12 — Idempotency needs durable identity, not just replay denial

- A deny-only `usedIdempotencyKeys` check cannot distinguish a safe retry from an unsafe reuse of the same key for a different request. The offline ledger fingerprints the validated request (excluding the key itself) and stores the original task ID.
- Same-key/same-request retries should return the first task ID without creating another entry. Same-key/different-request must be a conflict and must not mutate stored bytes.
- A lock and atomic file replacement protect one local workspace from concurrent writers, but they do not coordinate multiple machines or make the task record and ledger a single transaction. A future broker needs an explicit crash-recovery strategy for the gap between claiming a key and creating the task.
- This is local persistence and offline test coverage only. CI remains pending inspection; no claim of live broker or distributed exactly-once execution is made.

## 2026-10-12 — Lifecycle/idempotency validation result

- Latest BOAT Offline Tests run [38227586730](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38227586730) completed successfully on the current PR head: **176 test checks passed, 0 failed**; Control Center deterministic suite passed **37/37** and the read-only published-root lineage audit step completed successfully.
- The idempotency tests verified same-request replay returns the original task ID, changed-request key reuse conflicts without modifying persisted bytes, persistence survives reload, and lock/corrupt-state handling fails closed.
- Validation is for the offline/local implementation only. It does not establish distributed idempotency, a live API/auth broker, cross-run artifact resume, or atomic task-record-plus-ledger creation. No merge, dispatch, provider/web/image calls, publishing, or `main` change.

## 2026-10-12 — Atomic task store and crash recovery

- Added `scripts/boat-task-store.mjs`: one versioned JSON document stores task records and idempotency-key mappings together, so creating a task and claiming its key are committed in one atomic file replacement instead of two independent files.
- Added `scripts/test-boat-task-store.mjs`: task+claim consistency, restart replay, changed-request conflict with byte-preservation, interrupted-running recovery, checkpoint preservation, invalid input, corrupt store, dangling idempotency reference, and lock contention.
- Recovery turns persisted `running` tasks into `paused`, adds an explicit recovery note, preserves the last checkpoint, and does not execute work. Resuming still requires a separate explicit operator action.
- Offline CI on implementation head `692b7e63be3e2229ec32e878321f35eba0c038f4` passed **182 tests, 0 failures**, including the new task-store recovery tests and published-root lineage audit. The workflow-filter update was independently validated in [run 38228067483](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38228067483): offline regression suite and read-only published-root lineage audit both passed.
- Reduced CI churn by replacing the broad `BOAT/**` path trigger with `BOAT/schemas/**`; documentation-only edits no longer trigger BOAT Offline Tests. Task state/store/idempotency source and test files are explicitly included, along with schema files.
- Limits: single local filesystem/workspace only; no multi-machine coordination, live authentication/API, workflow dispatch, or production connection. Atomic rename protects the combined JSON update, but host/power-loss durability and cross-run hosted-runner persistence are not yet end-to-end proven. No new dependency, paid AI/web usage, publishing, article mutation, merge, or `main` change.

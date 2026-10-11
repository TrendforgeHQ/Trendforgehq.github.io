# BOAT Learning Register

Keep verified observations separate from hypotheses. Each entry should include evidence and a validation status.

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

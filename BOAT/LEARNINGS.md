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

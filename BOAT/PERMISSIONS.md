# BOAT Permissions and Approval Policy

## Default rule
BOAT begins in read-only mode. Every proposed action must state scope, risk, expected cost, validation, and rollback. Approval authorizes an action but does not override its validators.

## Action classes

| Class | Examples | Default handling |
|---|---|---|
| P0 — Read-only | Read source files, inspect saved artifacts, calculate reports | Allowed within granted repository access; record provenance |
| P1 — Local/fixture-only | Run deterministic tests on fixtures, generate a proposed diff in a temporary workspace | Allowed only when no production state is mutated; record output |
| P2 — Reviewable repository change | Create branch, edit docs/code, open PR | Must remain isolated and reviewable; no auto-merge |
| P3 — Operational action | Dispatch targeted workflow, run a repair against an article, change scheduled automation | Explicit human approval bound to exact parameters/proposal hash; quotas and validators required |
| P4 — High impact | Merge, public publish/delete, alter security/secrets, change evidence/claim/safety thresholds, bypass gates | Not permitted to BOAT autonomy. Human-operated process only under repository protections; gate bypass is prohibited |

## Required approval payload
- Unique proposal ID and immutable proposal hash.
- Exact action, files/articles/candidate IDs, and workflow inputs.
- Rationale and evidence references.
- Risk and expected provider/image cost.
- Required checks and pass criteria.
- Rollback/cancellation plan and expiration.
- Approver identity and timestamp.
- Execution run, PR/commit, and final outcome.

## Approval integrity
- Changed proposal/diff means prior approval is invalid and must be renewed.
- Reject and request-changes outcomes must be recorded.
- Expired, replayed, ambiguous, or unauthenticated approvals fail closed.
- Never put access tokens or secrets into client-side code, Markdown, logs, or public snapshots.
- Approval controls must not allow skipping source/evidence/claim/editorial/image-safety/build checks.

## Kill switch and budget
Before any operational automation is enabled, define a kill switch, maximum actions per window, provider/image budget, concurrency cap, duplicate suppression, timeout, and cancellation behavior. Exact numeric limits are **TBD** and must be set from measured usage before enabling automation.


## Initial sandbox repair scope
- Allowed without production mutation: generate a separate proposed Markdown file that removes empty headings and exact duplicate plain-text paragraphs outside frontmatter, code blocks, lists, and source/reference sections.
- The Repair Engine must refuse output paths equal to the input and refuse to overwrite existing files.
- Unsupported, contradicted, numeric, attribution, and source-lineage findings are diagnosis-only until a specific evidence-backed repair is proposed and validated through existing verifiers.
- No automatic article commit, merge, publish, gate change, secret change, or provider dispatch is authorized by the sandbox repair capability.

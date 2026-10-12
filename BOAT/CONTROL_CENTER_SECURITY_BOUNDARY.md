# BOAT Control Center Security Boundary

**Date:** 2026-10-12  
**Status:** Design proposal only — no live task API or authentication implemented  
**Repository:** `TrendforgeHQ/Trendforgehq.github.io`

## Purpose

Define the security boundary required before the static Control Center can submit BOAT tasks, display durable task history, request repairs, or approve changes. This is a design gate, not a claim that the current Control Center is live or authenticated.

## Current verified boundary

- The site uses Next.js static export (`output: 'export'`) and GitHub Pages. `app/control-center/page.tsx` is built into static output; it cannot safely host server-only secrets or enforce server-side authorization.
- The current page reads committed JSON and runs read-only catalogue calculations at build time. It is an observational snapshot, not a live task console.
- The manual-only workflow in `.github/workflows/boat-manual-audit.yml` has only `workflow_dispatch`, read-only `contents: read` / `actions: read` permissions, and no provider secrets or publishing-workflow coupling.
- Static workflow tests and BOAT Offline Tests passed in run [38224116086](https://github.com/TrendforgeHQ/Trendforgehq.github.io/actions/runs/38224116086). The manual workflow has **not** been dispatched, so artifact download and cross-run resume are not end-to-end verified.
- The production publishing workflow is scheduled and privileged. It is explicitly out of bounds as a BOAT browser command endpoint.
- The current PR stack is draft/unmerged. Do not merge to `main` merely to unlock a manual dispatch.

## Security invariants

1. **No privileged browser token.** GitHub tokens, provider keys, deployment secrets, and artifact credentials never enter browser JavaScript, HTML, URLs, local storage, or client-visible build variables.
2. **Server-side authorization is mandatory.** A hidden button, static route, CORS rule, or UI state is not authorization.
3. **Read-only first.** The first live integration may submit and read audit tasks only. It cannot edit articles, create repair commits, merge, publish, dispatch image generation, or call paid providers.
4. **Least privilege.** The worker can read only the pinned repository revision and required workflow artifacts. No `contents: write` for audit-only jobs.
5. **Pinned provenance.** Every task records the exact 40-character commit SHA, task-profile version, normalized configuration, initiating identity, creation time, budgets, and artifact/run IDs.
6. **Fail closed.** Missing identity, expired sessions, invalid input, stale commit, mismatched task configuration, inaccessible artifact, budget exhaustion, or uncertain state returns an explicit blocked/unknown result—not PASS.
7. **No publishing coupling.** A BOAT task cannot dispatch, call, or modify the production publishing workflow.
8. **Human approval is bound to exact bytes.** Future repair approval must be bound to a proposal hash, base commit, target paths, and test plan. Any changed proposal invalidates approval.
9. **Auditable state.** Task state changes and approval/rejection decisions are recorded with actor, timestamp, task/proposal identity, and reason; credentials and sensitive tokens are excluded.
10. **Untrusted content stays data.** Article text, claims, source excerpts, issue titles, and model output must never be interpreted as instructions to the runner or authorization policy.

## Proposed trust boundaries

```text
Public static Control Center
  |  no secrets; renders status and report links
  v
Authenticated server-side broker (not selected or implemented)
  |  validates identity, session, CSRF/origin, input schema, rate limits
  v
Narrow BOAT task API / queue
  |  allowlisted read-only task types; fixed repository/ref policy
  v
Manual-only isolated worker
  |  pinned checkout; read-only permissions; zero AI/web budget by default
  v
Portable JSON checkpoint + Markdown report + audit events

Repair proposal (future phase)
  -> authenticated human review
  -> approval bound to proposal hash + base SHA + path allowlist
  -> isolated branch and tests
  -> human-controlled merge/publish outside BOAT
```

The broker is a required trust boundary if the UI is to become live; it is not yet chosen. A static page must not call GitHub privileged APIs directly.

## Request and task contract

A task-submission request should contain only:
- a supported task type from a server-side allowlist;
- a full commit SHA, or an explicit server policy for resolving a default revision;
- bounded batch size and maximum batches;
- explicit AI/web budgets, both zero unless separately authorized;
- an idempotency key and a schema version.

The server—not the client—sets the repository identity, permitted refs, workflow identity, maximum budgets, and authorization scope. Reject arbitrary workflow names, arbitrary repository names, shell fragments, unbounded URLs, and client-supplied permission claims.

A task response should expose task ID, status, pinned commit, created/updated time, progress cursor, completed/total units when known, finding counts, budget usage, report/artifact references, and a stable error code. It must not expose raw secrets, environment values, runner tokens, or unrestricted log bundles.

## Authentication and browser protections

Before selecting a provider or hosting product, require an implementation proposal to answer:
- How user identity is verified and how sessions expire/revoke.
- Where server-only credentials live and how they are rotated.
- How same-origin policy, CSRF protection, allowed origins, and rate limits are enforced.
- How task read access is scoped to the initiating user or an explicitly authorized operator.
- How audit events are retained and how access is reviewed.
- What the recurring cost, free-tier limits, quotas, and failure modes are.

Use secure, HTTP-only, same-site cookies or an equivalent reviewed session mechanism where appropriate; never place bearer secrets in query strings or browser storage. Validate request schemas on the server and enforce CSRF/origin checks for cookie-authenticated state-changing requests. CORS is not a substitute for authentication. No auth product is selected in this design.

## Workflow and artifact rules

- The manual audit workflow remains separate from the production publishing workflow.
- Artifact access must be authorized server-side; do not expose private artifact download credentials to the browser.
- Verify task ID, prior run ID, artifact name, pinned commit, task-profile version, and checkpoint schema before resume.
- Treat artifacts as expiring transport, not a permanent database. Show retention/expiry and preserve a portable export.
- A resumed task must reject a changed commit/config/profile and must not silently restart from zero while appearing to resume.
- The first end-to-end workflow test must use a bounded audit (`max_batches=1`) and inspect the JSON checkpoint and Markdown report before attempting a resume. No provider/web budget is needed.
- Because the workflow is not on the default branch, an actual `workflow_dispatch` may be unavailable until a reviewed merge. Do not bypass this by merging to `main` or by adding an automatic production trigger. Continue testing the worker and workflow contract offline in the PR stack until the operator explicitly approves a deployment path.

## Repair approval — future, not part of the first live slice

A repair proposal must be immutable and include:
- finding IDs and evidence/provenance references;
- exact base commit and current article hash;
- exact target paths and before/after diff;
- rationale, uncertainty, risk, and regression tests;
- proposal SHA-256 and expiry/status.

Approval is valid only for that exact proposal hash, base SHA, and path set. Any changed bytes, base commit, target path, or test plan require fresh approval. Rejection and expiry are terminal auditable events. Execution creates an isolated branch/PR; BOAT never auto-merges or publishes.

## Threats and mitigations

| Threat | Required mitigation |
|---|---|
| Token theft from static bundle | No secrets in client bundle; server-side broker only |
| Unauthorized task submission | Server-side identity/authorization, task allowlist, rate and budget limits |
| Workflow confused-deputy attack | Fixed workflow and repository allowlists; no user-provided shell or workflow names |
| Malicious article/source prompt injection | Treat all article/evidence/model text as untrusted data; deterministic policy outside model |
| Resume a different task or commit | Bind task ID, run ID, artifact, commit SHA, config/profile, and schema |
| Duplicate/replayed requests | Idempotency keys and explicit task-state transitions |
| Stale approval or TOCTOU | Approval bound to proposal hash and base SHA; revalidate immediately before branch write |
| Artifact expiry or loss | Explicit expiry state and portable JSON/Markdown export; no false claim of durable history |
| Accidental production publishing | No publish workflow token, dispatch, trigger, or callable interface in BOAT worker |
| Silent semantic overclaim | Keep semantic support unknown unless independently assessed; historical PASS is provenance only |

## Acceptance criteria before any live integration

- A documented identity/session and server-secret design has been reviewed.
- Static client contains no privileged token and can operate read-only without authentication secrets.
- Unauthorized, expired, cross-user, malformed, replayed, over-budget, and stale-commit requests fail closed in tests.
- Audit worker remains read-only with AI/web budgets at zero by default.
- Workflow dispatch is restricted to one allowlisted manual audit workflow and one repository.
- Artifact resume is tested across two runs on a disposable/bounded task; mismatched run/task/commit/profile tests are negative.
- No publish, image-generation, provider, article-edit, merge, or main-branch side effect occurs.
- The operator approves any hosting/authentication product only after a cost/quota/security comparison.

## Next implementation order

1. Keep the current static Control Center read-only.
2. Add offline request/response schema fixtures and tests for task authorization decisions without selecting a hosted service.
3. Test task artifact manifest validation and negative resume cases offline.
4. Resolve the manual-dispatch deployment gate with an explicit human decision; do not merge to unlock it automatically.
5. Only then compare low-cost broker/auth options and implement the smallest server-side adapter.
6. Add authenticated read-only task submission/history first; defer repair execution to a separately reviewed phase.

## Current status

This document is a security design proposal only. It does **not** implement authentication, an API, a queue, durable shared task history, or repair execution. The live Control Center remains a build-time snapshot. PR changes remain isolated from `main`; no publishing workflow or provider/image call was run.

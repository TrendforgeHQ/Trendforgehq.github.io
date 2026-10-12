# BOAT Control Center Interface & Backend Contract Audit

**Date:** 2026-10-12  
**Repository:** `TrendforgeHQ/Trendforgehq.github.io`  
**Audit branch:** `feat/boat-control-center-vertical-slice-audit`  
**Base:** BOAT draft PR #35 head `afbacc3649e70af3561d77981d6f246afc43938b`  
**Status:** Interface audit complete; implementation boundary identified. No production behavior changed.

## Executive decision

The current Control Center is a static observability dashboard, not a live BOAT workspace. Do not add a fake chat that only echoes user text, and do not place a GitHub token or privileged action credential in browser code. The first real workspace must have a separately authenticated task backend. The static site can remain the presentation layer.

## Evidence inspected

- `next.config.mjs` sets `output: 'export'`, so Next.js API routes/server actions cannot serve as the deployed runtime backend on GitHub Pages.
- `app/control-center/page.tsx` exports a static page and reads committed JSON snapshots at build time. It imports catalogue, historical evidence coverage, and current-byte lineage audits.
- The page explicitly describes catalogue checks as structural and historical claim reports as not proving the currently published bytes. These limitations are correct and must remain visible.
- `scripts/test-control-center.mjs` has 37 deterministic checks for dashboard sections, truthful unknown states, static data dependencies, and audit limitations.
- `.github/workflows/control-center-qa.yml` runs the deterministic suite and a production build on relevant PRs.
- `.github/workflows/publish.yml` runs the production publishing pipeline on a six-hour schedule and supports manual dispatch. It has write permission and provider secrets. It is not a safe general-purpose chat endpoint and must not be triggered by arbitrary browser input.
- The existing BOAT records state that the offline lineage-manifest builder is not integrated into publish-time manifest persistence or the Control Center. Exact hashes prove byte identity, not semantic truth or source freshness.

## Current interface findings

### Already available

1. Static status dashboard, historical run summaries, provider telemetry, learning/performance snapshots.
2. Build-time published article catalogue inventory and structural findings.
3. Historical claim-report coverage with explicit historical-only interpretation.
4. Exact-current-byte lineage coverage where a valid saved manifest exists.
5. A deterministic Control Center test suite and build gate.

### Missing for the requested product

1. Authenticated task submission and natural-language conversation with a real BOAT runtime.
2. Durable task records and task states (queued, running, needs-review, blocked, completed, failed).
3. Per-task progress, findings, source references, proposal diffs, test results, and execution history.
4. Authenticated approval/rejection bound to an immutable proposal hash and expiry.
5. A protected execution worker that runs read-only audits or approved isolated-branch repairs.
6. An event trail linking user, task, input revision, findings, proposal, approval, run, commit/PR, test outcome, and rollback.
7. A true claim-to-source semantic review and external-web retrieval path; current catalogue checks do not provide these.

## Recommended first vertical slice

Deliver one honest, end-to-end, read-only task before enabling repair:

1. User opens the Control Center and chooses **Audit published articles**.
2. The browser sends a task request to an authenticated backend. The request contains an allow-listed task type, user instruction, request ID/idempotency key, and bounded options—not shell commands or arbitrary workflow names.
3. The backend authenticates the user, validates authorization and limits, stores the task, and queues it.
4. A least-privilege worker runs the existing deterministic catalogue audit and current-byte lineage audit against a pinned repository commit. It does not invoke paid providers or the publishing workflow.
5. The worker records per-article results and explicit `unknown` / `blocked` states for missing or mismatched artifacts.
6. Control Center polls or subscribes to task status and renders the real findings and provenance links.
7. Task events/results remain retrievable after reload; retry is idempotent and cannot silently duplicate work.

This first slice is read-only. It proves the path from instruction → task → worker → findings → visible history without creating a production mutation capability.

## Backend boundary and security requirements

- **No secrets in the static frontend.** No PAT, provider API key, signing key, or privileged GitHub credential may be shipped to client JavaScript or static JSON.
- **Authentication:** use an established identity provider or authenticated gateway. Do not treat a hidden URL, CORS, or a client-supplied username as authentication.
- **Authorization:** distinguish read-only audit, proposal creation, and execution permissions. Approval must be checked server-side.
- **Least privilege:** the read-only worker receives repository read access only. A separate execution worker can be considered later.
- **Input handling:** treat user text, article content, web pages, and source snippets as untrusted data, never as system instructions. Task types and tool permissions are allow-listed.
- **No arbitrary execution:** the browser cannot choose arbitrary shell commands, workflow file names, branches, repository paths, or secrets.
- **Approval integrity:** an approval binds to an immutable proposal hash, target branch, exact diff, required checks, risk/cost estimate, and expiry. Any changed diff requires new approval.
- **Replay/idempotency:** request IDs and approval nonces are single-use or idempotent; reject expired, repeated, cross-user, or mismatched approvals.
- **Rate/cost controls:** per-user limits, bounded article batches, worker concurrency limits, timeouts, and an explicit provider/image budget. The read-only slice has a zero paid-provider budget.
- **Auditability:** append-only task/action events with actor, timestamps, commit SHA, run IDs, artifact hashes, and outcome. Never log secrets.
- **Fail closed:** missing evidence or backend availability yields `unknown` / `blocked`, not a green status.
- **Production isolation:** no merge, publication, article overwrite, gate change, or publishing workflow dispatch from the first slice.

## Hosting decision

GitHub Pages is suitable for the static presentation only. A real chat/task backend must be hosted separately (for example, a protected service or authenticated gateway) and configured through deployment secrets/environment variables. Do not choose a provider or deploy a service until the available hosting/account capabilities and authentication method are confirmed. The first PR should define an adapter contract and a safe disabled state, not pretend a backend exists.

## Acceptance criteria for the first implementation PR

- The UI distinguishes **backend not configured**, **queued**, **running**, **completed**, **blocked**, and **failed** states truthfully.
- No mock assistant response is presented as a real BOAT result.
- A request is accepted only for an allow-listed read-only audit task.
- The backend verifies identity and authorization; the client cannot self-assert approval.
- Task submission is idempotent, bounded, and leaves a durable audit record.
- The worker is pinned to a known commit and has read-only repository permissions.
- Every article result carries provenance and explicit limitations; missing data is unknown.
- Unit/integration tests cover unauthenticated requests, unauthorized task types, duplicate request IDs, prompt-injection-like article text, missing artifacts, timeouts, and immutable event history.
- Existing publishing, evidence, claim-verification, editorial, image-safety, and build gates are unchanged.
- No production publishing workflow or paid provider is run by the tests.

## Explicit non-goals for this slice

- Factual repair application, branch writes, PR creation, merging, or auto-publishing.
- Autonomous source fetching or model calls.
- Competitor benchmarking.
- Scheduled BOAT runs or targeted publishing dispatch.
- Changing existing publishing cadence, provider routing, thresholds, or safety gates.

## Next action

Choose/confirm the separately hosted authenticated backend and identity boundary, then implement the smallest read-only task API + worker contract and wire the Control Center to real task states. Until that backend is available, keep the UI honest and the action controls disabled. Continue on a dedicated branch; do not merge to `main`.

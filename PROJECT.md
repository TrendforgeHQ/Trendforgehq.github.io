# TrendForge Project State

Last updated: 2026-10-11

## Product
TrendForge is a technology publication plus a browser-first practical Tools ecosystem. Tools live inside the existing TrendForge site; there is no separate tools repository.

## Live Tools

### AI — 5
- Prompt Optimizer
- Prompt Comparator
- LLM Cost Calculator
- Token & Context Calculator
- RAG Chunking Calculator

### Developer — 10
- JWT Inspector
- Webhook Tester
- API Request Builder
- cURL → Code
- JSON → TypeScript
- JSON Schema Generator
- API Response Diff
- Regex Playground
- OpenAPI Validator
- HTTP Headers Analyzer

### SaaS & Business — 8
- SaaS Pricing Calculator
- MRR Calculator
- ARR Calculator
- Churn Calculator
- LTV Calculator
- CAC Calculator
- SaaS Break-even Calculator
- Revenue Forecast Calculator

**Total: 23 tools.**

## Testing status

The deterministic calculation/transform engines have focused test coverage:
- AI suite: comparator, LLM cost, token/context and RAG calculations.
- Developer suite: JSON diff, JSON→TypeScript, JSON Schema, Regex, headers, OpenAPI structure and cURL conversion.
- SaaS suite: pricing, MRR, ARR, churn, LTV, CAC, break-even and forecast calculations.
- Prompt Optimizer has its own focused test script.

Important: this does **not** mean every interactive browser path has been exhaustively tested. Network-dependent Developer tools (Webhook Tester and API Request Builder) require real endpoint/CORS testing, and UI/accessibility/manual regression testing is a separate validation layer. Results should therefore be described as **core logic tested**, not as a blanket guarantee that every possible input or external endpoint works.

## Architecture rules
- Browser-first and zero-cost core.
- No mandatory login.
- No paid API dependency for core tools.
- No unnecessary backend/database.
- User data stays local for local transformations where possible.
- Network requests happen only when the user explicitly runs a request-based Developer tool.
- Tools must not import, trigger or depend on TrendForge editorial generation, evidence, claim verification, writer/provider routing, repair, image generation or publication automation.
- No Tool feature may add a workflow trigger that starts publishing work.

## Release status
The AI, Developer and SaaS first-wave suites are merged to main and have been deployed to the live TrendForge site. Production deployment success is the release gate; core test coverage remains documented above.

## Next quality step
Before expanding the catalog further, perform a dedicated Tools QA pass covering every route, representative edge cases, mobile layout, accessibility, SEO metadata, privacy messaging, network/CORS behavior and cross-tool navigation. Fix findings in isolated PRs without touching the publishing pipeline.

## BOAT — Editorial Operations Bot

BOAT is a separate, staged project to build a controlled editorial operations agent for article audits, claim/source verification, editorial benchmarking, learning from verified outcomes, and quota-aware prioritization of urgent topics. It must preserve all existing publication gates.

- Canonical blueprint: [BOAT/BLUEPRINT.md](BOAT/BLUEPRINT.md)
- Current state and phase ledger: [BOAT/PROJECT_STATE.md](BOAT/PROJECT_STATE.md)
- Roadmap: [BOAT/ROADMAP.md](BOAT/ROADMAP.md)
- Baseline audit: [BOAT/BASELINE_AUDIT.md](BOAT/BASELINE_AUDIT.md)
- Next task: [BOAT/NEXT_STEP.md](BOAT/NEXT_STEP.md)

BOAT begins in read-only mode. The current Control Center is static and cannot safely execute privileged actions by itself. Runtime behavior, workflow dispatch, article repairs, and approval UI are out of scope for the initial documentation phase. All changes must use a dedicated branch and PR; do not modify main directly or bypass evidence, claim, editorial, image-safety, or build gates.

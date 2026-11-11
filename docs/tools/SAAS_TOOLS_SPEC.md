# SaaS & Business Tools — MVP

The Phase 3 first wave is a browser-only calculator suite: SaaS Pricing, MRR, ARR, Churn, LTV, CAC, Break-even and Revenue Forecast.

## Product rules
- Inputs are user assumptions; outputs are estimates, not financial advice.
- No account, database, paid API or backend is required.
- Calculations run in the browser.
- Provider-specific pricing is not hard-coded.
- The suite must not import or trigger TrendForge editorial/publishing workflows.

## Scope
These calculators deliberately use transparent formulas rather than pretending to forecast business outcomes. More advanced scenario modelling can be a later phase.

## QA finding — MRR
The MRR calculator was corrected to include Starting MRR. Ending MRR now equals starting MRR + new MRR + expansion MRR − contraction MRR − churned MRR. This prevents the calculator from incorrectly presenting net monthly movement as the actual MRR balance.

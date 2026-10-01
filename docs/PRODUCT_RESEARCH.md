# BudgetBrain: product research and development review

Reviewed 1 October 2026. Scope: the existing React/Express/Prisma application, its calculation and mutation paths, current product references, and a focused implementation pass. This is a product hypothesis backed by desk research and code inspection, not evidence that BudgetBrain has already improved users' financial outcomes.

## Where it can be useful

BudgetBrain's strongest proposition is a short, explainable answer to “What remains before my next payday after essential costs?” That fits people paid weekly or fortnightly, students and workers managing a small buffer, and people who find monthly category budgeting too much work. Start with one person, one currency, a reconciled balance and a confirmed payday. Irregular income and shared households require additional modelling before being promised.

Potential benefits are earlier visibility of a shortfall, less mental arithmetic, a clearer bill list, and fewer decisions based only on a bank balance. None of the research supports assigning a savings percentage, revenue forecast, or clinical stress-reduction claim to this particular app.

### Evidence and its limits

| Source | What it supports | Implication for BudgetBrain |
| --- | --- | --- |
| [ASIC Moneysmart: Simple money manager](https://moneysmart.gov.au/budgeting/simple-money-manager) | A straightforward income-and-expense planning workflow; an authoritative Australian reference, not an evaluation of our app. | Make setup and the calculation understandable before adding more analytics. |
| [YNAB: Assigning future income](https://support.ynab.com/en_us/assigning-future-income-an-overview-BJsTo0jCq) and [targets](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC) | Distinguishing money available now from future plans; setting aside money for later expenses. | Expected payday income must not silently become a received transaction. Add sinking funds after balance reconciliation. |
| [PocketSmith: Budget calendar](https://www.pocketsmith.com/tour/budget-calendar/) | Bills and predicted balances can be arranged by date to expose future cashflow problems. This is a competitor capability, not proof of user outcomes. | Make the current payday window visible before building a long-range forecast. |
| [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Keep frequent decisions prominent and reveal secondary detail on demand. Foundational guidance, not a new trend. | Show one allowance, then its breakdown; put assumptions behind a labelled disclosure. |
| [August 2026 Australian budgeting discussion](https://www.reddit.com/r/AusFinance/comments/1vn8isv/strugeling_finding_a_financebudgeting_app_that/) | One user's complaints about manual entry, fortnightly planning, categorisation and overwhelming options. Anecdotal and not representative. | Test low-effort entry and payday-based comprehension with real participants. |
| [September 2026 Australian app discussion](https://www.reddit.com/r/AusFinance/comments/1wt56h8/best_money_managementbudgeting_app/) | Community interest in bank feeds and a shared overview. Small, self-selected sample. | Bank sync and household support are research candidates, not automatic launch requirements. |
| [Mobbin web gallery](https://mobbin.com/discover/apps/web) | A reference catalogue; detailed screens require access not available in this review. | No claim of inspecting or copying gated designs. Use the project's own components and tokens. |

## What the code review found

The application has useful foundations: authentication and user-scoped records, a persisted payday configuration, protected costs, CSV previews, recurrence detection, demo data, optional integrations and automated tests. Earlier “all checks passed” results did not establish that all financial paths agreed; some tests preserved undesirable legacy behavior.

| Finding and reproducible scenario | Outcome in this pass |
| --- | --- |
| Mark a standalone recurring payment PROTECTED. It was classified OPTIONAL and did not reduce the allowance. `financialStateService.js` | Fixed: confirmed recurring payments count, including every occurrence within the window; ignored/pending candidates do not. |
| Set a balance/essentials plan, then check a purchase or ask AI to explain it. Those paths rebuilt monthly-history estimates. `financeController.js`, `chatController.js` | Fixed: dashboard insights, purchase assessment and AI summaries use the financial-state service. |
| Leave the saved payday in the past. The allowance could still look normal with no future costs. | Fixed: explicit SETUP state, low confidence, guided next steps and blocked purchase approval. Out-of-range dates are rejected on save. |
| Save “Friday” and an expected pay amount. The legacy form created an income transaction. `PaydaySetup.jsx` | Fixed: a date field and configuration save; expected money is not recorded as received income. |
| Add a manual transaction. Context refreshed only old insights and could leave the authoritative state stale. `FinanceContext.jsx` | Fixed: shared refresh after mutation; failed guidance refresh clears old advice and does not misreport a completed save as failed. |
| Repeat a January 31 bill monthly. Native date overflow skipped February. | Fixed: anchored calendar recurrence, including leap-year behavior. |
| A linked manual cost matched multiple weeks of a recurring bill. | Fixed: explicit links still need a matching date window. |
| Optional costs appeared in the displayed obligations total but were excluded from protected money. | Fixed: the breakdown uses the same deduplicated protected obligations as the calculation. |
| Recovery guidance treated past dining spending as cash available to close today's gap. | Removed: only potential future adjustable-cost reductions enter that arithmetic. |
| Confidence checkmarks were inferred by matching English words in labels. | Fixed: the API sends explicit check booleans. |
| Export omitted the new payday and protected-cost data. `authController.js` | Added those fields while retaining the explicit secret-free connection selection. |
| Long-lived schedules replayed every historical date. | Replaced with direct calendar/index arithmetic and a bounded 366-day forecast window. |

## Frontend directions

These are distinct product directions, not just alternate colours. The implementation follows the first as a conservative extension of the existing interface; the other two remain options for user research.

| Direction | Layout and visual language | Benefit | Tradeoff and references |
| --- | --- | --- | --- |
| **Payday Brief — recommended** | One allowance and setup status; two supporting cards for calculation and due costs. Existing Manrope/DM Sans, green accent, neutral surfaces; text rather than decorative imagery; no new animation. | Fast daily check, legible on mobile, cheapest to maintain. | Limited long-range planning. Learn prioritisation from [NN/g](https://www.nngroup.com/articles/progressive-disclosure/) and simplicity from [Moneysmart](https://moneysmart.gov.au/budgeting/simple-money-manager); chronological cues from [PocketSmith](https://www.pocketsmith.com/tour/budget-calendar/). |
| **Cashflow Calendar** | Date-led month/week view with daily balance and accessible event list. Same typography, restrained colours, no colour-only warnings; minimal transition motion. | Shows timing and collisions between bills and pay. | Needs accurate due dates, income streams and more mobile/keyboard work. References: [PocketSmith calendar](https://www.pocketsmith.com/tour/budget-calendar/), [its forecasting guide](https://learn.pocketsmith.com/calendar--forecasting/6a6X8SseDAXwf8ZqYunJuU/calendar--forecasting/6a6X8SseDC6Tf6LVTYGKYJ), [NN/g](https://www.nngroup.com/articles/progressive-disclosure/). |
| **Envelope Coach** | A short setup journey followed by essentials/flexible/sinking-fund allocations, progress bars with text values and an explicit unallocated amount. Minimal imagery and motion. | Teaches intentional allocation and annual-cost preparation. | More setup and a new allocation ledger; risks duplicating mature envelope products. References: [YNAB targets](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC), [future income](https://support.ynab.com/en_us/assigning-future-income-an-overview-BJsTo0jCq), [Moneysmart](https://moneysmart.gov.au/budgeting/simple-money-manager). |

The new Payday Brief reuses `--surface`, `--text`, `--muted`, `--primary`, and the existing radii. It includes semantic definition/list markup, date elements, visible focus styling, responsive columns, error/retry and setup states, currency-aware values and an assumptions disclosure. Pixel layout and real keyboard navigation still require browser verification.

## What remains missing, in priority order

| Priority | Addition or repair | Why / acceptance criterion | Scope |
| --- | --- | --- | --- |
| P0 | Balance reconciliation and a timestamped balance ledger | Today a manually entered balance is a snapshot. Spending and imported history do not automatically update it. Introduce account opening balances, settled/pending activity, transfer semantics and an explicit reconcile operation without double counting imports. The UI now discloses the limitation. | Large; model design and migration |
| P0 | Durable, enforced AI privacy preferences | `authController.js` keeps most preferences in a process-local Map; the AI controllers do not enforce those choices. Persist choices and test that opt-out prevents financial context leaving the app across restarts. | Medium; migration and AI-boundary tests |
| P0 | Currency consistency for imports, edits and base-currency changes | CSV/YNAB normalization preserves source amounts; editing an amount and changing base currency lack a full revaluation contract. Block unsafe re-denomination or migrate with rates and provenance. Mixed-currency protected recurrence now blocks a ready estimate. | Large; contract and migration |
| P0 | Atomic/idempotent import confirmation | `confirmCsvImport` creates transactions then updates import state separately. A crash or concurrent confirmation can leave duplicates/inconsistent status; fingerprints have a non-unique index. Add an atomic claim and a deliberate uniqueness/reimport policy. | Medium; database integration tests |
| P1 | Accurate debt due dates and bill payment reconciliation | Debt minimums currently use an estimated payday date; overdue one-off bills need an explicit unresolved/paid state. Add due date, paid occurrence and transaction linking. | Medium/large |
| P1 | Holiday-adjusted effective payday | The holiday API returns a forecast but the state uses the stored expected date. Persist a confirmed effective date and make every consumer use it. | Medium |
| P1 | Multiple/irregular income streams | Separate expected, confirmed and received money; support several payers and uncertainty. Test a late/partial payment and avoid spending anticipated income early. | Large |
| P1 | Sinking funds for annual costs | Spread an annual cost across paydays without reserving the full amount twice. Show funded vs required, linked to the protected-cost plan. | Medium/large |
| P1 | CI and live database regression tests | Existing suites predominantly mock persistence. Add PostgreSQL-backed migration, ownership, concurrent import and revaluation tests, and run them on pull requests. | Medium |
| P1 | Session recovery, password reset and deployment checks | Check real login expiry/recovery flows, production secrets, restore procedures and dependencies before any public launch. These were not verified in this pass. | Medium |
| P2 | Opt-in reminders / PWA | A payday reminder and a due-bill review could reduce maintenance effort. Requires permission controls, timezone rules, delivery dedupe and a genuine offline policy; never cache sensitive responses casually. | Medium |
| P2 | Household budgets | Invite roles, shared vs private accounts, ownership boundaries and audit history must precede shared editing. | Large |
| P2 | Real Australian bank data | Evaluate providers, reliability, consent, cost and applicable requirements before selecting or connecting a service. Keep CSV usable as fallback. No provider procurement or production connection was performed. | Large/external |

Avoid adding investing recommendations, a marketplace, more AI-generated scores or a large chart library before the P0 work. They do not solve the trust and maintenance problems found here.

## How to establish actual benefit

Run an opt-in two-week usability pilot with 8–12 participants who use weekly or fortnightly pay. Use fictional scenarios first; do not collect account credentials or unnecessary transaction detail. Proposed success criteria are hypotheses, not achieved results:

1. At least 80% can enter balance, payday and three essential costs unaided within five minutes.
2. At least 90% correctly explain why the available bank balance differs from the displayed allowance.
3. All participants recognise an expired-payday setup state and a projected shortfall in the scripted tasks.
4. Median time to check a purchase and find its explanation is under 30 seconds.
5. Track second-week return use and corrections needed per import; interview abandoners before choosing reminders or bank sync.

Use minimal, consented events such as setup completed, estimate reviewed and import corrected. Do not place balances, merchants or transaction text in analytics. Compare time, comprehension and error rate against participants' existing spreadsheet or bank-app workflow. A small pilot can find usability problems; it cannot establish population-wide savings or commercial viability.

## Engineering verification

The frontend, backend, testing, coordination, research and performance skills shaped this pass: existing patterns were reused, financial contracts were unified, reproducible bugs determined priorities, and the schedule optimization was measured.

Regression coverage includes recurring protection, repeated occurrences, cross-week deduplication, expired/far-future payday, optional/paused exclusions, purchase boundary values, month-end/leap-year dates, mixed currencies, authenticated state reads, cross-user cost mutations, safe refresh failures and expected-income persistence.

Run `npm --prefix server test -- --maxWorkers=1 --no-file-parallelism`, `npm --prefix client test -- --maxWorkers=1 --no-file-parallelism`, and `npm run build`. Run `node server/scripts/benchmark-schedules.js` for the reproducible synthetic benchmark: 2,000 weekly schedules starting in 1900 and a ten-day window. One local run took 2,958.14 ms with historical replay and 22.09 ms with direct indexing, with identical occurrence counts. This is a stress-case microbenchmark, not API latency or a typical-user speed claim. Work scales with occurrences inside the bounded window rather than years since the anchor.

Final verification: 70 backend tests passed across 9 files; 29 frontend tests passed across 8 files; the production Vite build and `git diff --check` passed. These include mocked API tests, not a live PostgreSQL integration run. An older date-dependent currency test now fixes its clock, and the payday regression tests enforce the date/configuration contract instead of the former expected-income transaction behavior.

No schema migration or new dependency was needed for this pass. The browser connection timed out, so screenshots, responsive layout and interactive browser checks are not claimed. The repository has no lint or typecheck script. Passing unit tests does not resolve the P0 limitations above.

Before publishing the changes, local startup was also verified with the existing PostgreSQL container: the frontend returned HTTP 200 with the app entry point, API health returned `ok`, and the fictional demo account successfully loaded both financial state and dashboard insights. Its expired saved payday correctly produced `Setup Needed`. These read-only smoke checks supplement, rather than replace, database integration tests.

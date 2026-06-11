# FedEx QuickShip — Project Instructions

## Objective
Maintain and roll out FedEx QuickShip: a single-file, client-side web app (`app/fedex_bot.html`) that turns ServiceNow tickets into 29-column FedEx Ship Manager CSV batches for the 11-person PSC3 Desktop Support team at Aspen Dental. Active workstream: restore the parser to green (see CLAUDE.md → Task 1), then execute the hosting rollout (private GitHub repo → in-tenant host → Teams tab).

## Session start — every session, before anything else
1. Read `CLAUDE.md` in the working folder root. It is the live memory and says exactly where work stopped.
2. Run `npm test`. State the result and the current phase in one line before acting.
3. End every session by updating `CLAUDE.md`: what changed, current test count, next step, any new decision.

## Hard invariants — MUST hold at all times
1. `app/fedex_bot.html` is the ONLY place app logic lives. NEVER create a second runnable copy or paste the parser anywhere else. `tests/load-parser.js` extracts the parser from the HTML at run time — that is the only sanctioned reuse.
2. `tickets/sample-tickets.json` is the contract. Every `expected` block is a Daniel-confirmed business rule. NEVER edit an expected value to make a test pass. If an expected value looks wrong, stop and ask Daniel.
3. Ship only green. `npm test` MUST end `34/34 tickets passed.` with exit 0 (update the number only when tickets are added) before any commit, zip, or handoff.
4. Parser changes are test-first: add the real ticket with Daniel-confirmed expected values → watch it fail → fix `app/fedex_bot.html` → green, with zero regressions.
5. Frozen shipping facts — change only on Daniel's explicit instruction: sender block (Daniel Yonan / Aspen Dental / shippinghelp@aspendental.com / 3154546000); defaults PRIORITY_OVERNIGHT, OUTBOUND, YOUR_PACKAGING, USD, LBS; device specs Laptop 5 LBS 15x11x4, single iPad 2 LBS 12x9x2, Standard Equipment expands to three CSV rows with reference suffixes, Custom = typed values; the 29-column CSV header and its order.
6. One canonical hosted copy. Interim copies get retired, never multiplied.

## Authoritative documents
- `docs/superpowers/specs/2026-06-01-fedex-quickship-hosting-design.md` — architecture and locked decisions (store / run / reach).
- `docs/superpowers/specs/2026-06-01-fedex-quickship-rollout-implementation-plan.md` — checkbox-tracked execution plan.
Specs are the contract. If a request conflicts with a spec, flag the conflict — do not improvise around it.
(Recovered-repo note: the real recovered paths are `docs/superpowers/specs/2026-06-01-fedex-quickship-repo-hosting-design.md` and `docs/superpowers/plans/2026-06-01-fedex-quickship-rollout.md`. See CLAUDE.md corrections.)

## Environment facts
- This machine cannot reach github.com, Azure, or the Microsoft tenant. For any step there, output exact click-by-click instructions for Daniel (Windows, GitHub Desktop, M365 web UIs) in checkbox format, each step with a `Verify:` line and its expected result. NEVER claim to have performed those steps.
- Canonical local path on Daniel's machine: `C:\Users\Daniel Yonan\Documents\GitHub\Fedexbot`. (Superseded 2026-06-11 — see CLAUDE.md decisions: `C:\Users\A608629\Documents\GitHub\Fedexbot`.)
- Test gate: `npm test` runs `node tests/run-regression.js` over `tickets/*.json`. Useful flags: `--verbose`, `--id <TICKET_ID>`.

## How to work with Daniel
- Give ONE opinionated recommendation, not an options matrix. When a decision is genuinely his, ask it as a structured multiple-choice question that needs minimal typing.
- Parser rules are business rules: Daniel states correct values explicitly; never silently reinterpret. Capture each as a named rule in code comments and in CLAUDE.md.
- No theoretical fixes — every parser claim is proven by `npm test` output pasted in the response.
- Plain language in anything the team will read: short sentences, the reader's action as the verb, no em dashes in body copy.

## Scope locks
- NO frameworks, build steps, bundlers, servers, or databases. The app stays one client-side HTML file.
- Only make changes directly requested. Do NOT add features, abstractions, or files beyond what was asked. Do NOT redesign UI or flows that already work.
- Do NOT start rollout phases out of order. Phases 4–5 are blocked on IT's Phase 3 answer.

## Stop conditions
Stop and ask Daniel before: deleting any file; adding any dependency; editing any `expected` value in `tickets/`; changing the CSV header, sender block, or device specs; modifying `.github/workflows/`; touching anything outside the repo folder.

## Progress reporting
After each completed step output: ✅ [what was done] — [file(s) affected] — [current test count].

# CLAUDE.md — FedEx QuickShip working memory
Last updated: 2026-07-06 (SharePoint rollout sequenced A/B/C + SPFx build/deploy runbook written; SPFx pkg bumped 0.3→0.4; 40/40 + 3/3 + 8/8 green) · Read me first every session. Update me last every session.
Operating rules live in `PROJECT-INSTRUCTIONS.md` (repo root, also in the Cowork project instructions).

## What changed this session (2026-07-06, SharePoint rollout sequenced + SPFx build/deploy runbook)
Daniel ran /product-management:brainstorm: "convert the project into a SharePoint site with connectors,
was told to make an SPFx package to move over from GitHub." Applied Observation 3's lesson: scanned
docs/superpowers/specs + CLAUDE.md BEFORE asking. Found the SPFx package already built (2026-06-11) and
SPFx already chosen (Phase 3), so did NOT re-design — confirmed the decision and SEQUENCED the work.

Decisions confirmed (Daniel, 2026-07-06, structured question):
- "Connectors" = FedEx labels + shared SharePoint list + hosting ("what it does now, just with
  SharePoint integration and conversion").
- Rollout status: NOT handed off yet (the SPFx package has never been sent to IT / SharePoint team).
- Approved sequencing A → B → C, ship A now:
  - Track A = Hosting (already built; only compile + deploy remain, both off-machine).
  - Track B = Shared SharePoint list (NEW, proposed). Blocked on A + IT.
  - Track C = FedEx live labels (already specced; own track). Blocked on IT + premium licensing.

Verified SPFx build-ready (no compile possible here; verified by inspection + a real embed run):
- `spfx/tools/embed-app.js` re-embeds `app/fedex_bot.html` at build time (Invariant 1 preserved).
  Ran it in a /tmp sandbox under Node 22.22.3: embedded the CURRENT v0.4.0 app (155,674 chars; the
  generated module contains the sender email, `QuickShip v0.4`, and `buildShipRequest`). The committed
  `generated/appHtml.ts` is stale (150,598 chars) but is gitignored and the build regenerates it.
- `QuickShipWebPart.ts` frames the app in an iframe via `srcdoc = APP_HTML`, so localStorage persists
  per user and CSV downloads work. Manifest `supportedHosts` = SharePointWebPart/SharePointFullPage/
  TeamsTab. `config.json` bundle wired. `skipFeatureDeployment: true` (tenant-wide deploy).

Changed (SPFx packaging only; NO app/tests/tickets edits):
- Bumped the SPFx package version 0.3.0.0 → 0.4.0.0 (`spfx/config/package-solution.json` solution +
  feature) and `spfx/package.json` 0.3.0 → 0.4.0 so the deployed package matches the v0.4.0 app it
  embeds. Dependency versions untouched (1.21.1 x8, etc.). Delivered via /tmp + cp + sha256 verify.

Wrote two docs (authored in /tmp sandbox, delivered with cp + sha256 + tail/line check — OneDrive
mount truncation hazard held):
- `docs/superpowers/plans/2026-07-06-sharepoint-rollout-sequenced.md` — the A/B/C tracks, the shared-
  list proposal (with the PII governance flag), and a paste-ready one-message IT ask that surfaces all
  three permissions in one round (hosting now, list next, flow later).
- `docs/superpowers/runbooks/2026-07-06-spfx-build-and-deploy.md` — click-by-click build (Node 22,
  `npm install`, `npm run package` → `spfx/sharepoint/solution/fedex-quickship.sppkg`) and deploy,
  grounded in Microsoft Learn: upload the .sppkg → check "Make this solution available to all sites in
  the organization" → Deploy → "Sync to Teams" from the ribbon → add the Teams tab. Human-executed off
  this machine (can't reach the tenant). Includes the lighter self-contained-HTML fallback (spec B1).

Track B named idea (shared SharePoint list): once hosted as an SPFx web part, the app runs in the
SharePoint page as the signed-in user and can read/write a SharePoint list via the built-in REST API —
no Azure, no separate backend, no secrets. Replaces per-browser localStorage and kills the multi-tab
"only last entry survived" class of bugs. GOVERNANCE FLAG: today recipient name+address never leave the
browser (spec §10); a shared list stores that shipment data in-tenant. In-tenant + sign-in, likely fine,
but confirm with IT/security before building. No parser/CSV change implied (same shipment rows).

Gate re-verified this session (zero edits to app/tests/tickets): `npm test` 40/40 exit 0;
ship-request 3/3; persistence 8/8.

NOT committed (no push from this machine). Suggested commit for Daniel (review diff in GitHub Desktop):
`docs: sequenced SharePoint rollout plan + SPFx build/deploy runbook; bump SPFx pkg to 0.4.0`.

Next step: Daniel sends the IT ask (plan §6). On the hosting yes, run the build/deploy runbook (or hand
it to IT) to get the Teams tab live = Track A done. Then decide Track B (shared list) pending IT's
governance answer; Track C (FedEx flow) stays its own track, blocked on premium licensing.

## What changed this session (2026-06-19, FedEx live-label API — Phase 2 flow plan + sandbox runbook)
Daniel re-asked the same "integrate FedEx API so it auto-generates and prints labels" question. The
design spec AND Phase 1 already existed and were green, so this session did NOT re-design. It
confirmed three decisions via structured questions and produced the next two docs.

Decisions confirmed (Daniel, 2026-06-19, structured questions):
- Backend = Power Automate flow (matches spec decision 4; Azure Function stays declined).
- Printing = Zebra thermal, ZPL, auto-print via Zebra Browser Print (matches spec decision 2).
- FedEx account: Daniel HAS it and can use it. This advances spec open question on production
  account ownership (still confirm sandbox-vs-production account + meter before go-live).

Wrote two docs (authored in /tmp sandbox, delivered with `cp` + sha256 match + tail/line check —
NO truncation; the OneDrive-mount hazard held):
- `docs/superpowers/plans/2026-06-19-fedex-flow-phase2.md` — Phase 2 = the Power Automate flow.
  HTTP trigger restricted to tenant (Entra OAuth, NOT the anonymous URL), Azure Key Vault Get
  secret x3 (client id/secret/account, Secure Inputs+Outputs), FedEx OAuth token, Create shipment
  (account injected via `setProperty(triggerBody(),'accountNumber',...)`), Parse JSON, Response
  `{trackingNumber, encodedLabel, status, errors}`, Try/Catch scope. 6 tasks, every step has a
  `Verify:` line. Human-executed by Daniel/IT in M365/Azure (this machine can't reach the tenant).
- `docs/superpowers/runbooks/2026-06-19-fedex-sandbox-label-proof.md` — by-hand sandbox proof with
  the EXACT `buildShipRequest` payload (April Walsh outbound). Step 3 saves the real response JSON;
  the flow's Parse JSON schema is generated from that file (so no path is hardcoded blind).

Flow facts verified against Microsoft Learn (carry into the build): the HTTP trigger's "Who can
trigger the flow?" has native Entra OAuth modes "Any user in my tenant" / "Specific users" (still
rolling out by region — confirm it appears); Azure Key Vault Get secret is a premium connector;
the token to CALL the flow uses audience `https://service.flow.microsoft.com/`. FedEx label/tracking
path is `output.transactionShipments[0].pieceResponses[0].{trackingNumber, packageDocuments[0].encodedLabel}`
— flagged in the plan to verify against the saved sandbox response, not trusted blind.

Process note: logged task-observer Observation 3 — brainstorming re-asked questions already locked
in an existing spec; the fix is to scan docs/superpowers/specs before asking. (skill-observations/log.md)

No app/tests/tickets edits. Gate unchanged this session: `npm test` 40/40 exit 0; ship-request 3/3;
persistence 8/8. NOT committed (no push from this machine). Suggested commit for Daniel (review diff
in GitHub Desktop): `docs: FedEx Phase 2 flow plan + sandbox label-proof runbook`.

Next step: Daniel runs the sandbox runbook off-machine (print one real label, save the response
JSON), then builds the flow per the Phase 2 plan or hands it to IT. After the flow returns a label,
the next Claude session builds the App-wiring plan (Create+Print buttons, Browser Print, address +
duplicate guards) — blocked on the flow existing + premium licensing confirmed.

## What changed this session (2026-06-19, FedEx live-label API — Phase 1 plan)
Daniel asked how to start integrating the FedEx API so the app auto-creates and prints labels.
Found an already-approved design spec from earlier today that was NOT logged here:
`docs/superpowers/specs/2026-06-19-fedex-live-label-api-design.md` (status: approved in
brainstorming, awaiting written-spec review). Daniel reaffirmed the design and chose to proceed to
a plan, Phase 1 first.

Wrote `docs/superpowers/plans/2026-06-19-fedex-live-label-api.md` (Phase 1 only, TDD, bite-sized).
Then IMPLEMENTED Phase 1 the same session (Daniel said go):
- `buildShipRequest(row, opts)` added to `app/fedex_bot.html` in the extractable pure-helper region
  (just before the `const $ =` END_MARKER); exported via `tests/load-parser.js` typeof guard.
- New `tests/ship-request.test.js`, 3 golden checks (outbound, return, multi-package). Test-first:
  RED (function undefined) -> GREEN **3/3**.
- Gates green together: `npm test` **40/40 exit 0**, persistence **8/8**, ship-request **3/3**;
  app integrity drill OK (one `</script>`, ends `</html>`, inline script parses).
- Mapping facts: takes a queue row; OMITS the account number (the flow injects it); weightUnits
  LBS -> FedEx LB; label STOCK_4X6/ZPLII/COMMON2D; shipDate + pickupType injected (defaults today /
  DROPOFF_AT_FEDEX_LOCATION, confirm before go-live). The test compares the JSON-normalized form
  because the function runs in load-parser's vm realm (deepStrictEqual rejects cross-realm protos);
  that JSON form is also exactly what gets POSTed to FedEx.
- Version intentionally NOT bumped (still v0.4 / 0.4.0): no UI wired yet, so the visible app is
  unchanged. Bump when the Create+Print buttons land.
- NOT committed (no push from this machine). Suggested commit for Daniel (review diff in GitHub
  Desktop): `feat: buildShipRequest(row) FedEx Ship mapping + golden tests (Phase 1, no UI yet)`.

OneDrive mount hazard hit HARD this session: the Write/Edit TOOLS silently truncated CLAUDE.md AND
`tests/load-parser.js` mid-file. bash `cp` from a sandbox copy + sha256 verify did NOT truncate.
Working rule reinforced for this folder: author/modify every repo file in the sandbox and deliver
with `cp` + sha256 (plus the tail / integrity drill). Do not trust direct Write/Edit on this mount.

Design refined by reading the actual code (carry these into implementation):
- `buildShipRequest` takes a **queue row**, not the raw parse. A row is already one ship-ready
  package (Standard Equipment / multi-qty pre-expanded with -1/-2/-RTN refs; returns already have
  sender/recipient swapped). It is `buildCsv`'s sibling: same row in, FedEx Ship JSON out. Lives in
  the extractable pure-helper region (lines 495–1939), next to the queue helpers; no DOM, so
  load-parser can export it like the others.
- **Account number never enters the app.** `buildShipRequest` omits top-level `accountNumber`; the
  Power Automate flow injects it from Key Vault. Keeps the shipper account out of the browser and
  the public repo.
- Injected opts: `shipDate` (default today), `pickupType` (default DROPOFF_AT_FEDEX_LOCATION), both
  CONFIRM-before-go-live. `weightUnits` 'LBS' → FedEx 'LB'. Label spec STOCK_4X6 / ZPLII / COMMON2D.
  No `recipientCompany` exists in the row/CSV (recipient company on the label is parked).

Scope-lock note: this feature adds an external backend (the flow). The design spec amends invariant
1 (app logic still lives in the one file; the flow is only a secret-holding messenger). Daniel
reaffirmed the amendment.

Next step: implement the plan (Task 1: `buildShipRequest` outbound mapping, test-first) on Daniel's
go, or Daniel reviews the plan first. Later phases (flow, Browser Print, UI buttons, guards, batch)
need IT + premium Power Automate licensing and are outlined in the plan, not built.

## What changed this session (2026-06-19, queue durability: multi-tab fix + Save/Load batch)
Daniel's bug: building a big multi-person batch, then on reload "only the last/latest entry"
survived. Root cause was NOT missing persistence (queue already saves to localStorage). It was
last-writer-wins across tabs/reloads: a stale tab (in-memory queue loaded while empty) overwrote
the whole `fedexBot.v0.3` key with just its own row; the 200ms debounced save could also drop the
final add on unload. Confirmed by reading the code + an end-to-end two-tab simulation.

Fix (all in `app/fedex_bot.html`; PARSER UNTOUCHED; STORAGE_KEY kept = 'fedexBot.v0.3' so existing
saved queues survive the upgrade):
1. Merge-on-write: pure helpers `dedupeQueueByReference` / `mergeForPersist`. Every add reconciles
   this tab's in-memory queue with what's currently persisted (another tab may have added rows),
   appends, de-dupes by `reference`, writes through. Stale tab can no longer drop rows.
   (`addRowsToQueue` at the two queue-add sites.)
2. Immediate persistence for queue ops: add/remove/clear call `persistNow()` (synchronous) not the
   200ms debounce; debounce kept only for non-queue edits (profile fields). `beforeunload` flushes.
   Closes a found-in-review edge: remove-then-add within 200ms used to RESURRECT the removed row.
3. Cross-tab sync: a `storage` event listener refreshes this tab's queue from latest persisted.
4. Save batch / Load batch (.json): portable backup surviving reloads, cleared storage, machine
   moves. Load MERGES (non-destructive) and is idempotent. Helpers `serializeBatch` /
   `parseBatchFile` (reject non-JSON and queue-less JSON; accept our wrapper or a bare array).
5. Restore note on load so the tech trusts the queue is still there.
Version 0.3.0 -> 0.4.0; footer + report stamp now "QuickShip v0.4".

Testing (test-first): new `tests/persistence.test.js` (8 checks), extracted via `load-parser.js`
(now also exports the queue helpers behind typeof guards, so the parser suite is never coupled).
RED 0/8 -> GREEN 8/8. End-to-end two-tab simulation (real functions, shared in-memory localStorage)
proves: stale-tab add keeps all rows after reload; removed row stays gone after a later add;
re-add of same ticket de-dupes. `npm test` 40/40 exit 0 before+after. Full inline-script
`new Function` parse OK; `</script>`==1; ends `</html>`.

NEW NAMED RULE - Queue durability: the queue is the user's work product and must never be silently
lost. All queue mutations persist immediately and reconcile-by-reference with storage before
writing; Save/Load .json is the portable backstop. `reference` is the de-dupe key (every shipment
row already carries a unique one incl. -RTN / -1/-2 suffixes).

Decisions (Daniel-confirmed 2026-06-19 via structured question):
- De-dupe by reference => re-adding the SAME ticket does NOT create duplicate rows. CONFIRMED keep
  (prevents accidental double-shipping; aligns with the parked duplicate-shipment-warning idea).
  Now a business rule: `reference` is the queue de-dupe key.
- Load batch MERGES into the current queue (non-destructive); Clear queue first to replace.

Env hazard repeat: the OneDrive mount silently truncated a freshly written test file (same as the
2026-06-11 incident). Worked in a /tmp sandbox copy, delivered to the repo with a sha256
verify-and-repair loop, re-ran the gate green in the real folder.

NOT pushed - this machine can't reach GitHub. Push steps for BOTH repos were given to Daniel in
the session (private DYonan1990/Fedex-bot = this folder; public DYonan1990/Fedexbot clone = Pages).

## What changed this session (2026-06-11, day-one hardening)
- Implemented `docs/superpowers/specs/2026-06-11-day-one-hardening-design.md` (plan:
  `docs/superpowers/plans/2026-06-11-day-one-hardening.md`), three changes to `app/fedex_bot.html`:
  1. **Self-contained file**: Tailwind baked into `<style id="tw-baked">` (15.6 KB, generated once
     with Tailwind CLI 3.4.17 outside the repo), Google Fonts removed, system font stack. ZERO
     external requests — fixes the blocked-CDN risk for SharePoint/SPFx. Embed round-trip rerun OK.
  2. **Verify flags**: low/medium-confidence and defaulted fields get amber outline + chip
     ("verify" / "defaulted — confirm"), live summary line `#verifySummary` ("Check before
     adding: …"), flags clear when the tech edits the field. Display only, parser untouched.
  3. **Report bad parse** button: copies raw ticket + parsed fields + a "should have been"
     section to the clipboard for pasting to Daniel in Teams. Feeds the dataset loop.
- Parser untouched; `npm test` **34/34, exit 0** before and after every task.
- **NEW RULE — styling**: Tailwind no longer runs at runtime. New UI styles must be plain CSS in
  the existing `<style>` block (or reuse already-baked utilities). New Tailwind class names will
  NOT style themselves. If truly needed, regenerate via Tailwind CLI 3.4 outside the repo and
  re-splice `<style id="tw-baked">` (see plan doc Task 3).
- Parked ideas (Daniel-approved backlog, in order): week-one dataset drive (each tech reports one
  weird ticket), ZIP↔state sanity check, duplicate-shipment warning (per-browser only),
  return-flow walkthrough → own spec, printable one-page quick card from `docs/team-guide.md`.

## What changed earlier the same day (2026-06-11, SharePoint handoff package)
- **Phase 3 answered: the SharePoint team wants an SPFx package** (Daniel, structured question).
  This closes the spec §12 question "Azure SWA or SPFx?" → SPFx (spec Option B2, sanctioned
  "only if IT specifically prefers it" — condition met). Phases 4–5 unblock via the SPFx route.
- Built `spfx/` (new folder at repo root): SPFx **1.21.1** solution wrapping the app as web part
  "FedEx QuickShip" (supportedHosts: SharePointWebPart, SharePointFullPage, TeamsTab).
  Pinned 1.21.1 deliberately: last gulp toolchain, Node 22 LTS; SPFx 1.22 switched to Heft.
  IDs: solution `9871cc40-f784-4295-9041-7188559ba434`, web part `8b2babb0-…-56103cee58f4`.
- **Invariant 1 preserved**: `spfx/tools/embed-app.js` copies `app/fedex_bot.html` into the
  bundle AT BUILD TIME (mirrors tests/load-parser.js). Generated module
  `spfx/src/webparts/quickShip/generated/appHtml.ts` is gitignored. One copy currently sits in
  this folder because the OneDrive mount blocks deletion — it is AUTO-GENERATED-marked,
  gitignored, and disposable. Round-trip verified byte-identical to the canonical app file.
- Built handoff zip `FedExQuickShip-SharePoint-Package-2026-06-11.zip` (repo root, untracked):
  app copy (SHA-256 6fcf711a… = canonical), spfx/, 3 Word guides (overview + build + deploy,
  plain-language with Verify lines), README.txt, MANIFEST.txt. Daniel shares the ZIP with the
  SharePoint team; the .sppkg itself cannot be compiled from this sandbox (needs npm/Node 22 on
  a real machine — guide doc 2 covers it, incl. a re-scaffold fallback).
- Verified this session: embed round-trip identical; all spfx JSON parses; zip integrity OK;
  hash chain canonical=package=zip; `npm test` **34/34, exit 0** before and after (zero edits
  to app/, tickets/, tests/, .github/).
- Noted: app is NOT fully self-contained — loads cdn.tailwindcss.com + Google Fonts. Deploy
  guide has a troubleshooting row for blocked CDNs.

## Where things stand — GREEN
`npm test` = **40/40 tickets passed.** exit 0, verified 2026-06-19 in this folder.
Durability suite: `node tests/persistence.test.js` = **8/8 checks passed.** (queue helpers, 2026-06-19)
(Dataset grew 32 → 34 → 35 on 2026-06-11, then → 40 on 2026-06-12: JUMBLED-ADDR-001..004 +
RETURN-REQ-002, all Daniel-confirmed. See named rules.)

## Dataset growth 2026-06-12: jumbled-address intake (spec + plan in docs/superpowers/)
- Five tickets from Daniel's real examples: four jumbled one-liners (ZIP floating mid-line,
  name first/last/own-line/mid + lowercase) and the Ray Lane conversational return email
  (comma-led name, sign-off "Thanks Dan" must not win). Ray Lane arrived via the
  **Report bad parse** button — the dataset loop working as designed.
- Test-first: 35/40 → Strategy A name-lookback (36/40; one regression caught and fixed when a
  blind string-replace patched the wrong `confidence.callerName` site — the suite caught it
  immediately) → Strategy C reassembly → **40/40**. File-integrity drill run (tags/`</html>`/
  full-script parse) + SPFx embed regenerated.

## Dataset growth 2026-06-11 (afternoon): RETURN-REQ-001
- Return-request email, 3-part name fused to the street on one line ("Gabrielle Aragon
  Flanagan 1220 Stonegate Dr Marengo, IL 60152"). Daniel confirmed all values incl.
  company TAG default and laptop ×1 from "return her laptop".
- Parser fix: **Leading-name rule** in parseAddressFromText Strategy B — a strict person-name
  pattern (2–4 capitalized words, no digits, no unit/PO keywords) is split off a segment that
  continues with a street number; the name feeds the existing careOf → address-name-is-recipient
  mechanism (`_addressNameRecipient`). Test-first: 34/35 → fix → **35/35**.

The "lost" hardened build was recovered intact. `Fedexbot-main.zip` (sitting in this folder) is a
GitHub download of branch `main`, commit `c030ce77df795a975fa5fcdec454435d98872c3e`, zipped
2026-06-02. It contained the full repo: hardened `app/fedex_bot.html` (116 KB, v0.3.0 in
package.json), golden dataset v1.0 (32 tickets, generated 2026-06-01), test harness, docs, and the
CI workflow (job name `regression`). **Task 1 (restore parser to 32/32) is closed by recovery.**
Zero parser edits, zero `tickets/` edits.

## What changed this session (2026-06-11)
- Verified the zip in a scratch copy first: 32/32, exit 0, dataset v1.0 / 32 tickets confirmed.
- Unpacked the zip into this folder root — canonical layout now: `app/`, `tests/`, `tickets/`,
  `docs/`, `.github/`, `package.json`, `QUICKSTART.md`, `README.md`, `index.html`, `.nojekyll`.
- Added `PROJECT-INSTRUCTIONS.md` and rewrote this CLAUDE.md.
- The old-machine recovery uploads were checked by content hash/size: scrambled (filenames do not
  match contents) and fully superseded by the zip. Nothing from them was needed except
  PROJECT-INSTRUCTIONS.md.
- Frozen facts spot-checked in the recovered build: sender block (shippinghelp@aspendental.com,
  3154546000), PRIORITY_OVERNIGHT defaults, 29-column header present. CI job: `regression`.

## Corrections to the previous (rebuilt-from-memory) version of this file
Real paths in the recovered repo differ from what the rebuild guessed:
- Hosting design spec: `docs/superpowers/specs/2026-06-01-fedex-quickship-repo-hosting-design.md`
- Rollout plan: `docs/superpowers/plans/2026-06-01-fedex-quickship-rollout.md`
- Team guide: `docs/team-guide.md`; quick start: `QUICKSTART.md` at repo root.
Still read every "22/22" in the plan as "32/32". Do not edit the plan document itself.

## Git / repo state
Local repo initialized 2026-06-11 08:08, single commit `e1d1063` containing only the zip and
`.gitattributes`. Everything unpacked this session is **untracked**; `.gitattributes` shows
modified (zip's version replaced it). No remote — Phase 1 (private GitHub push) still pending.

## Decisions recorded 2026-06-11 (Daniel)
1. `Fedexbot-main.zip` removed from the folder (was tracked in commit e1d1063; the next commit
   untracks it). Archive copy handed to Daniel via session outputs as
   `Fedexbot-main-RECOVERY-ARCHIVE-2026-06-11.zip`.
2. `index.html` + `.nojekyll` KEPT. Daniel is actively hosting on GitHub Pages as a temporary
   test/prep host before converting to a SharePoint site. This amends the earlier note: Pages was
   rejected as the PERMANENT host but is in live use as interim staging. Do not remove these files
   while Pages is in use.
   - Caveat flagged once: Pages on a free personal plan means the repo is public, which exposes
     the sender block (name, work email, 3154546000). The spec chose a private repo for exactly
     this. Revisit when the SharePoint site takes over.
3. SUPERSEDED same day by decision 4. (Was: canonical path = the OneDrive folder.)
4. Canonical local path: `C:\Users\A608629\GitHub\Fedexbot`, a fresh GitHub Desktop clone of
   `DYonan1990/Fedexbot` (the repo serving Pages). Not under `Documents` because Documents is
   OneDrive-redirected on this machine; the whole point was getting git out of OneDrive.
   Reason for the clone: Daniel wants a repeating Claude-edits → Daniel-pushes flow; the
   OneDrive folder's local git history is unrelated to the GitHub repo. The OneDrive folder
   gets retired once Daniel works a session in the clone (one canonical copy).
5. Setup executed 2026-06-11 by Claude driving GitHub Desktop + Explorer on Daniel's machine
   (with his approval): cloned the repo, copied CLAUDE.md + PROJECT-INSTRUCTIONS.md in,
   committed `f35fe81` "Add working memory and project instructions", pushed. Verified on
   github.com: CI run `regression #9` green (17s), Pages redeployed, live app loads at
   https://dyonan1990.github.io/Fedexbot/ (v0.3 UI, sender profile intact).
   Also fixed during setup: the uploaded PROJECT-INSTRUCTIONS file was scrambled (contained the
   dataset JSON); rewrote the real one before anything was committed.

## Dataset growth 2026-06-11 (later the same day)
- Added TEAMS-MSG-001 (Janae Grupenhagen — facility prefix + state-route street + Ste) and
  TEAMS-MSG-002 (Nicole Johnson — lowercase comma address + suite). Expected values confirmed
  by Daniel via structured questions (suite → line2; company TAG default for Nicole; lowercase
  kept as typed). Test-first: 32/34 fail → parser fixes in `app/fedex_bot.html`
  (facility-prefix strip in Strategy B, mid-string unit pull in the no-comma branch,
  facility→company map at the fallback call site, 9c Teams-message name rule) → **34/34**.
  Zero edits to existing tickets. Dataset `version` field left at 1.0 intentionally.

## Repo state change 2026-06-12 (Daniel): TWO repos, push to BOTH
- Daniel published THIS OneDrive folder as a new PRIVATE repo `DYonan1990/Fedex-bot`
  (GitHub Desktop shows it as "Fedex-bot", lock icon). This folder is now a live git
  working copy again — no more hand-copy needed for the private repo.
- The original PUBLIC repo `DYonan1990/Fedexbot` (clone at `C:\Users\A608629\GitHub\Fedexbot`)
  still serves GitHub Pages for the team. Changes still reach it via the Explorer copy +
  GitHub Desktop flow.
- Daniel's decision: **push every change to BOTH** until the SharePoint site takes over,
  then retire the public one (which finally closes the public-repo privacy caveat).

## Push workflow (agreed 2026-06-11, amended 2026-06-12 for two repos)
1. Claude edits in the canonical clone folder and ends the session green (`npm test` exit 0,
   count stated) with a suggested commit message.
2. Daniel reviews the diff in GitHub Desktop, commits to `main`, pushes.
3. Backstops: the `regression` CI run re-executes the suite on GitHub; Pages redeploys
   automatically. Verify after each push: CI green, Pages URL opens the app (Ctrl+F5).
4. Dataset growth: Daniel pastes a real ticket plus the confirmed correct values; Claude adds it
   to `tickets/sample-tickets.json` (additions only, never edits to existing `expected`), watches
   it fail, fixes the parser, ends at the new higher count (33/33, 34/34, ...).

## Named parser rules (the dataset is the spec — each `raw`+`expected` pair is exact)
- **New Hire recipient rule**: the NEW HIRE is `callerName`; submitter → `_submitter`;
  `_isNewHire: true`; personal emails belong to the hire. SCTASK0531675, RITM1967295,
  RITM1049891, RITM1959453.
- **Address-name-is-recipient rule**: a name inside the address block is the recipient; requester
  → `_onBehalfOf`; `_addressNameRecipient` records it. RITM1991271.
- **Phone default rule**: missing/blank/Teams phone → `callerPhone: "3154546000"` +
  `_phoneDefaulted: true`. INC2192773, RITM1532785, RITM1049891, PASTE-ROW-001.
- **Shipping gate**: `"open"` (ship-confirmed / New Hire), `"blocked"` ("Is this being
  shipped: No"), or `"none"` (no gate field — INC / paste / Teams intake); never `"unknown"`.
  (Correction 2026-06-11: earlier rebuilds of this file omitted `"blocked"`; the dataset pins
  all three.)
- **Completeness checker**: partial addresses → `_addressPartial: true` + `_missingRequired`.
  RITM1969026.
- **Address hardening**: comma-less street/city splits; no-suffix street + spelled-out state
  (RITM1966855); care-of "%" stays in `line2` (RITM2004522); unit/apt fragments → `line2`.
- **Equipment via EQUIPMENT_FIELD_MAP**: desktop detection (RITM1988594), full New Hire kit
  (SCTASK0531675, RITM1049891).
- **Identity normalization**: lowercase emails; Aspen vs TAG by domain/context; CI extraction
  (ADMI-, gm-, cms, ATGB-); never junk like "Internet"/"Facility". INC2231755, RITM1985023,
  INC2183113.
- **Pasted spreadsheet row intake**: tab-separated row + bare address parses fully. PASTE-ROW-001.
- **Leading-name rule** (added 2026-06-11, Daniel-confirmed): a strict person name (2–4
  capitalized words, no digits/unit/PO keywords) fused directly onto a street number in one
  segment is split off as the recipient via the careOf mechanism. RETURN-REQ-001.
- **Jumbled-address reassembly** (Strategy C, added 2026-06-12, Daniel-confirmed): short
  anchor-less pastes (1–3 lines, exactly one 5-digit token, real state token) are reassembled
  by token position — street = number→ZIP, city = word before state, name (any case, 2–4 words)
  found before the street, after the state, or between ZIP and city → careOf. ALL fields low
  confidence → amber flags. Typed case kept. JUMBLED-ADDR-001..004.
- **Inline name-lookback** (Strategy A, added 2026-06-12, Daniel-confirmed): a comma-led
  person name immediately touching the street number of an inline address ("Ray Lane, 41506…")
  is the recipient via careOf, confidence medium; greetings/sign-offs elsewhere never match
  (adjacency required, period excluded from name words). RETURN-REQ-002.
- **Teams-message intake** (added 2026-06-11, Daniel-confirmed): a short paste (2–4 lines) whose
  first line is a bare person's name and whose rest yields an address → name = `callerName`.
  A facility prefix joined to the street by a dash ("Aspen Dental Hixson - 5550 ...") is
  stripped from the address and mapped to `company` by brand keyword (beats the TAG default,
  never beats an explicit Company field or email domain). Mid-string unit fragments ("Ste 100")
  no phone → DEFAULT_PHONE; no items → `[]`; gate `"none"`. TEAMS-MSG-001, TEAMS-MSG-002.

## Open questions for Daniel (design spec §12)
- Repo collaborators: just Daniel, or trusted teammates too?
- ~~IT preference: Azure Static Web App or SPFx?~~ **ANSWERED 2026-06-11: SPFx** (SharePoint
  team asked for the files; see SharePoint handoff session above).
- GitHub: personal free account, or an Aspen Dental org account?
- Stopgap week one: Daniel runs batches himself, or teammates get the synced copy day one?

## Next actions queue
1. DONE 2026-06-11: clone setup, first commit `f35fe81` pushed, CI `regression #9` green,
   Pages verified live. (See decision 5.)
2. Daniel: copy `spfx/` from this OneDrive folder into the canonical clone
   (`C:\Users\A608629\GitHub\Fedexbot`), commit, push.
3. Daniel: send `FedExQuickShip-SharePoint-Package-2026-06-11.zip` to the SharePoint team.
4. Next Claude session: Daniel selects `C:\Users\A608629\GitHub\Fedexbot` as the project
   folder; the OneDrive `Fedex bot` folder gets retired once a session works in the clone.
5. From then on: the Push workflow above for every change (parser fixes, new dataset tickets).
6. After SharePoint go-live: retire the public GitHub Pages copy (`index.html` + `.nojekyll`
   removal needs Daniel's say-so) and revisit repo visibility.

## FedEx live-label feature (2026-06-19) — where the docs live
- Design spec: `docs/superpowers/specs/2026-06-19-fedex-live-label-api-design.md` (approved).
- Phase 1 plan (DONE, green): `docs/superpowers/plans/2026-06-19-fedex-live-label-api.md`.
  `buildShipRequest(row)` is in `app/fedex_bot.html`; tests `tests/ship-request.test.js` 3/3.
- Phase 2 plan (the Power Automate flow): `docs/superpowers/plans/2026-06-19-fedex-flow-phase2.md`.
- Sandbox proof runbook: `docs/superpowers/runbooks/2026-06-19-fedex-sandbox-label-proof.md`.

## Incident 2026-06-11 (afternoon): truncated app file shipped
- One of the day's file writes through the OneDrive mount silently truncated
  `app/fedex_bot.html` (~5.7 KB tail lost: queue-render template, closing
  `</script></body></html>`). The page shipped broken; `npm test` stayed green
  because the harness extracts the parser by string markers and never reaches
  the tail. Same failure mode as the historic "Restore truncated tail" commit.
- Restored by grafting the tail from the recovery zip's app file (tail region
  untouched by all of today's changes) at the unique queue-template anchor.
  Full-script syntax check now part of the drill.
- **NEW RULE — after ANY write to `app/fedex_bot.html`**: verify all three
  before calling it done: (1) `grep -c '</script>'` returns 1, (2) file ends
  with `</html>`, (3) the whole inline script parses (`new Function` check).
  `npm test` alone does NOT prove the page loads.
- 2026-06-19 recurrence: the same mount truncated CLAUDE.md ITSELF mid-line during this
  session's Edit (everything from "## Next actions queue" onward was lost). Repaired by
  rebuilding the tail from in-context content in a sandbox copy and delivering with a
  line-count + tail + sha256 verify. Lesson generalizes: after ANY write through the OneDrive
  mount, verify the TAIL (not just the test gate) — CLAUDE.md and docs included, not only the app.
- 2026-06-19 recurrence #2 (Phase 2 plan session): the Edit tool truncated CLAUDE.md AGAIN,
  and this time the cut landed on the outputs/ SANDBOX copy (not the OneDrive mount); `cp` then
  copied the truncated file into the repo. Caught by the post-write tail/line/grep check and
  repaired by `head -n 338` of the good top + `cat`-appending the tail in /tmp, delivered with
  `cp` + sha256. HARD RULE: rebuild large memory/doc files by cat-join in /tmp; do NOT trust the
  Edit/Write tools on big files in this workspace; ALWAYS run the tail + line-count + grep check
  after delivering ANY file here.

## What changed this session (2026-07-06, ship the queue-durability fix)
- Daniel re-reported the reload-loses-queue bug from the LIVE site — which still served v0.3.
  Root cause of the confusion: the 2026-06-19 queue-durability fix (v0.4) was never pushed;
  it sat uncommitted in this folder. Verified locally before shipping: `npm test` 40/40,
  persistence 8/8, ship-request 3/3, live site footer confirmed v0.3.
- Shipped v0.4 to BOTH repos (private Fedex-bot = this folder; public Fedexbot clone via
  Explorer copy), then verified ON the live Pages site: two shipments added, page reloaded,
  queue intact; Save batch / Load batch buttons present; footer reads v0.4.
- No code changes this session — purely commit, push, redeploy, verify.
- Deploy note: the Pages "deploy" step of pages-build-deployment #14 failed transiently
  (build + artifact OK); retriggered with this follow-up commit. Lesson: after pushing the
  public repo, verify the PAGES deploy conclusion via the API, not just the regression run.
- Audit 2026-07-06 (post-v0.4 ship): full findings in
  `docs/superpowers/reviews/2026-07-06-audit-findings.md` — 4 confirmed
  functional bugs (storage-sync mode clobber; decimal dims -> 0; manual
  return swallowed by de-dupe; parse-over-parse field bleed), XSS-escaping
  gap, Strategy-C state false positive, v0.3 header badge, plus a PII
  inventory of the public repo (36 names / 29 home addresses public —
  decision pending). CSV escaping/ZIP+4/return-swap probed and NOT bugs.
- PII decision (Daniel, 2026-07-06): public-repo dataset PII ACCEPTED until SharePoint
  go-live (option c). Revisit at retirement of the public repo — see audit doc.

## What changed this session (2026-07-06, audit + top-5 fixes applied)
- Ran a full audit (independent subagent code review + probe verification + PII/compliance
  pass). Findings doc: `docs/superpowers/reviews/2026-07-06-audit-findings.md`.
- Daniel chose: implement top 4 bugs + version badge; ACCEPT public-repo PII until SharePoint.
- Applied 5 fixes to `app/fedex_bot.html` (all confirmed by probes first):
  1. storage listener copies ONLY the queue (was `loadState()` → clobbered STATE.mode across
     tabs, building a malformed return-shaped row on next Add).
  2. decimal package dims round to >= 1 in (was `parseInt('0.7')`=0 → 0-inch package) — fixed
     in BOTH `buildShipRequest` (API path) and the row-build (CSV path).
  3. Return-mode MANUAL add now suffixes `-RTN` (was reusing baseRef → collided with a queued
     outbound of the same ticket and got silently swallowed by reference de-dupe).
  4. parse handler clears stale recipient/sender/reference fields before applying a new parse
     (was: ticket B inherited ticket A's line2/reference and validated green).
  5. header badge v0.3 → v0.4 (footer already said v0.4).
- Test-first: added ship-request check #4 (decimal→1in), RED→GREEN. Gates: `npm test` 40/40,
  persistence 8/8, ship-request **4/4**, SPFx embed round-trip OK, full-script parse OK,
  `</script>`==1, ends `</html>`. Diffed the final app file against committed HEAD — exactly
  the 5 intended edits, zero artifacts.
- NOT pushed (no push from this machine). Suggested commit for Daniel:
  `fix: audit top-5 (cross-tab mode clobber, decimal dims, manual-return dedupe, parse field
  bleed, version badge) + ship-request 4/4`.
- Parked (Daniel deferred): XSS output-escaping (esc() helper), Strategy-C ZIP↔state sanity
  guard, and the minor nits (CSV formula-injection prefix guard, dead 'Phone number' branch,
  duplicated regexes) — all in the audit doc.

## Incident 2026-07-06: Edit tool truncated app AND test file mid-session (again)
- The Write/Edit tools on the OneDrive mount truncated `app/fedex_bot.html` (tail from the
  loadBatch handler onward lost) AND `tests/ship-request.test.js` (check #4 cut mid-comment).
  `npm test` stayed green because it extracts the parser by top-of-file markers and the test
  file silently ran 3 checks instead of 4 — neither caught the truncation.
- Repaired by rebuilding from committed HEAD in the /tmp sandbox: grafted the pristine tail,
  re-applied the lost edit, delivered with `cp` + sha256, then `diff` vs HEAD proved only the
  intended edits were present. REINFORCED RULE: never trust Write/Edit on this mount for these
  files — author in /tmp, deliver with `cp`, and always run the tail/`</script>`/full-parse
  drill AND confirm the expected test COUNT (4/4 here), not just "green".

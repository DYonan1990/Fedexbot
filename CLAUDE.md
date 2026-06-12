# CLAUDE.md — FedEx QuickShip working memory
Last updated: 2026-06-11 (day-one hardening session) · Read me first every session. Update me last every session.
Operating rules live in `PROJECT-INSTRUCTIONS.md` (repo root, also in the Cowork project instructions).

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
`npm test` = **40/40 tickets passed.** exit 0, verified 2026-06-12 in this folder.
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

## Push workflow (agreed 2026-06-11, active until SharePoint go-live)
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
  go to `line2`; route-name streets ("TN-153") survive; lowercase addresses stay as typed;
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
   (`C:\Users\A608629\GitHub\Fedexbot`), commit, push. Suggested message:
   `Add SPFx 1.21.1 wrapper (build-time embed of app/fedex_bot.html) — SharePoint hosting per Phase 3 answer`.
   The generated/ subfolder is gitignored and may be skipped when copying.
3. Daniel: send `FedExQuickShip-SharePoint-Package-2026-06-11.zip` to the SharePoint team.
   Optional: build the .sppkg himself first (guide doc 2; needs Node 22 → `node --version`).
4. Next Claude session: Daniel selects `C:\Users\A608629\GitHub\Fedexbot` as the project
   folder. Claude re-verifies 34/34 there, refreshes that CLAUDE.md, then the OneDrive
   `Fedex bot` folder gets retired (Daniel deletes it).
5. From then on: the Push workflow above for every change (parser fixes, new dataset tickets).
   SPFx update loop: parser fix → 34/34 → bump version in spfx/config/package-solution.json →
   `npm run package` → new .sppkg to the app catalog.
6. After SharePoint go-live (deploy guide step 6): retire the public GitHub Pages copy
   (`index.html` + `.nojekyll` removal needs Daniel's say-so) and revisit repo visibility —
   the public-repo caveat from decision 2 finally closes.

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

# CLAUDE.md — FedEx QuickShip working memory
Last updated: 2026-06-11 (recovery session) · Read me first every session. Update me last every session.
Operating rules live in `PROJECT-INSTRUCTIONS.md` (repo root, also in the Cowork project instructions).

## Where things stand — GREEN
`npm test` = **34/34 tickets passed.** exit 0, verified 2026-06-11 in this folder.
(Dataset grew 32 → 34 on 2026-06-11: TEAMS-MSG-001/-002, Daniel-confirmed. See named rules.)

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
- **Teams-message intake** (added 2026-06-11, Daniel-confirmed): a short paste (2–4 lines) whose
  first line is a bare person's name and whose rest yields an address → name = `callerName`.
  A facility prefix joined to the street by a dash ("Aspen Dental Hixson - 5550 ...") is
  stripped from the address and mapped to `company` by brand keyword (beats the TAG default,
  never beats an explicit Company field or email domain). Mid-string unit fragments ("Ste 100")
  go to `line2`; route-name streets ("TN-153") survive; lowercase addresses stay as typed;
  no phone → DEFAULT_PHONE; no items → `[]`; gate `"none"`. TEAMS-MSG-001, TEAMS-MSG-002.

## Open questions for Daniel (design spec §12) — unchanged
- Repo collaborators: just Daniel, or trusted teammates too?
- IT preference: Azure Static Web App or SPFx?
- GitHub: personal free account, or an Aspen Dental org account?
- Stopgap week one: Daniel runs batches himself, or teammates get the synced copy day one?

## Next actions queue
1. DONE 2026-06-11: clone setup, first commit `f35fe81` pushed, CI `regression #9` green,
   Pages verified live. (See decision 5.)
2. Next Claude session: Daniel selects `C:\Users\A608629\GitHub\Fedexbot` as the project
   folder. Claude re-verifies 32/32 there, refreshes this CLAUDE.md's clone copy, then the
   OneDrive `Fedex bot` folder gets retired (Daniel deletes it).
3. From then on: the Push workflow above for every change (parser fixes, new dataset tickets).
4. SharePoint conversion prep (Daniel's stated direction): Pages is the staging ground; plan the
   SharePoint site move per the rollout plan. Phases 4–5 stay blocked on IT's Phase 3 answer.
5. Revisit repo visibility (public Pages vs private-repo decision) when SharePoint takes over.

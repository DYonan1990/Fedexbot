# Day-one hardening — design spec

Date: 2026-06-11
Status: approved by Daniel (brainstorming session); awaiting written-spec review
Owner: Daniel Yonan · Author: Claude session
Baseline: app v0.3, dataset 34/34 green, commit lineage `53208f3`

## Why

All 11 PSC3 techs start using FedEx QuickShip day one when it moves into the
SharePoint tenant (SPFx route, Phase 3 answered 2026-06-11). Three risks stand
between today's build and that day:

1. The app loads cdn.tailwindcss.com and Google Fonts at runtime. A tenant
   that blocks public CDNs opens the app unstyled and broken-looking.
2. The parser rates every field's confidence internally but the form does not
   show it, so techs who did not build the dataset cannot tell which fields
   to double-check before printing a label.
3. When the parser misreads an odd ticket, nothing guides a tech to report
   it, so the dataset-growth loop (the only thing that permanently fixes
   parser misses) depends on Daniel noticing.

This spec hardens those three things. Nothing else.

## Non-goals

- No changes to parsing behavior. `npm test` stays 34/34 with zero edits to
  `tickets/`.
- No redesign of the return-label flow. "Returns are clunky" is real but
  needs its own discovery and brainstorm; deferred deliberately.
- No build step, framework, server, or second file. The app stays one
  client-side HTML file (hard invariant 1).
- No new hosting work. This rides the existing push workflow and is picked
  up by the SPFx package automatically at its next build.

## Change 1 — Self-contained file

**What:** Remove both runtime CDN dependencies from `app/fedex_bot.html`.

- The Tailwind CDN `<script>` is replaced by a baked `<style>` block
  containing only the utility classes the app actually uses. The CSS is
  generated once (Tailwind CLI run outside the repo, against the HTML's
  class attributes, honoring the page's inline tailwind config) and pasted
  in. The repo gains no build tooling.
- The Google Fonts `<link>` tags are removed. Typography falls back to the
  system font stack (`system-ui, Segoe UI, sans-serif`). Colors and the
  FedEx-branded theme are unchanged. Daniel accepted the font change.

**Acceptance:** `grep` finds zero `https://` resource loads in the file;
the app opens fully styled with the network disabled; the SPFx embed
round-trip (`spfx/tools/embed-app.js`) still produces a byte-identical copy.

**Follow-on rule (goes in CLAUDE.md):** future UI changes write plain CSS in
the existing `<style>` block or reuse already-baked utilities. Adding new
Tailwind utility class names will NOT style themselves anymore.

## Change 2 — Verify flags on parsed fields

**What:** Surface the parser's existing per-field confidence on the form.

- After a parse, every recipient/destination field whose confidence is
  `medium` or `low` gets an amber outline and a small "verify" tag rendered
  next to its label. Fields filled by a documented default get explicit
  text instead: "defaulted — confirm" (service-desk phone 3154546000, TAG
  company fallback).
- One summary line renders above Add to Batch: "Check before adding:
  Phone, Company" listing currently-flagged fields. It updates live.
- A tech editing a flagged field clears that field's flag (touched =
  human-verified). Parse again re-evaluates from scratch.
- Existing behaviors unchanged: the red "issues" validation strip, the
  blocked-gate banner, and "What the parser found" panel all stay as is.

**Acceptance:** parsing TEAMS-MSG-002's raw text (Nicole Johnson) flags
Phone and Company as defaulted; typing in the Phone field clears its flag
and removes it from the summary line; a fully high-confidence parse shows
no flags and no summary line.

## Change 3 — Bad-parse report button

**What:** A "Report a bad parse" control next to Parse Ticket.

- Click builds a plain-text block: app version, timestamp, the raw pasted
  ticket text, and the parser's filled values — exactly the fields the
  dataset pins (ticketNumber, callerName, callerPhone, callerEmail,
  company, line1, line2, city, state, zip, items, shippingGate, plus any
  `_` flags set on this parse) — separated by clear headers.
- The block is copied to the clipboard via `navigator.clipboard`, with a
  visible confirmation: "Copied — paste it to Daniel in Teams." If the
  clipboard API is unavailable, fall back to a selectable textarea in a
  simple in-page panel (no external libraries).
- Nothing is transmitted or stored. The report travels by the tech pasting
  it in Teams, where ticket text (names, addresses) already lives today.
- Daniel turns received reports into new dataset tickets via the existing
  test-first loop (35/35, 36/36, ...).

**Acceptance:** clicking the button after any parse puts the full block on
the clipboard and shows the confirmation; the block contains the exact raw
text and the parsed values.

## Testing and verification

1. `npm test` ends `34/34 tickets passed.` exit 0 before commit. The CSS
   bake must not disturb `tests/load-parser.js`'s parser extraction —
   proven by the test run itself.
2. Self-containment proof: no external URLs greppable in the file; manual
   open with network blocked renders styled.
3. Live checks on the deployed copy after Daniel pushes: parse Nicole's
   message → flags appear and clear correctly; report button copies; CI
   `regression` run green; Pages (and later SharePoint) serves the new
   build.

## Rollout

Same push workflow as today: Claude edits in the canonical folder, ends
green with a suggested commit message; Daniel reviews the diff in GitHub
Desktop, commits, pushes; CI re-runs the suite; Pages redeploys. The SPFx
package embeds the updated file automatically at its next `npm run package`
(version bump per CLAUDE.md SPFx loop). CLAUDE.md gains the plain-CSS rule
from Change 1 and records this spec as the active workstream.

## Out of scope, parked for later

- Return-label flow improvements (needs Daniel to walk through the current
  friction; own brainstorm + spec).
- Shipment history/audit beyond the existing localStorage queue.
- Any parser-accuracy work beyond the report-driven dataset loop.

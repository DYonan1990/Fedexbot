# Audit findings — 2026-07-06 (v0.4, 40/40 green baseline)

Independent code review + probe verification. Every numbered finding below was
CONFIRMED by running the actual code (probe outputs in session log). CSV
comma/quote escaping, ZIP+4, care-of "%" passthrough, return sender/recipient
swap, and blank-reference de-dupe were tested and are NOT bugs.

## Bugs (confirmed, ranked)

1. LABEL-CORRUPTING — cross-tab storage sync clobbers STATE.mode.
   The `storage` listener calls `loadState()` wholesale, so another tab
   switching to Return mode silently flips this tab's mode; the next Add
   builds a return-shaped row (empty sender) with a real reference.
   Fix: storage handler copies ONLY the queue, never mode/profile fields.

2. LABEL-CORRUPTING — decimal dimensions become 0 inches.
   `validate()` accepts `0.7`; the row stores `parseInt('0.7')` → 0.
   Probe: buildShipRequest length 0.7/height 0.9 → {"length":0,"height":0}.
   Fix: validate post-conversion values; round to >= 1.

3. SILENT DATA LOSS — manual Return-mode add with a reference already queued
   outbound is swallowed by de-dupe (kept: OUTBOUND only; no message).
   The prompt flow is safe (suffixes -RTN); the manual flow does not.
   Fix: suffix -RTN on Return-mode adds + surface a "merged/deduped" notice.

4. FIELD BLEED — parsing ticket B after ticket A keeps A's values in any
   field B didn't fill (line2, reference, etc.); validation then passes
   stale data. Fix: clear recipient/reference fields at parse start.

5. SELF-XSS / stored XSS via Load batch — parsed values render into
   innerHTML unescaped (findings panel, queue, return prompt, profiles);
   a crafted ticket or tampered batch .json executes script and persists
   via localStorage. Fix: esc() helper around every interpolation.

6. STRATEGY-C STATE FALSE POSITIVE — trailing filler words parse as states:
   "…60640 aurora ok thanks" → state OK on an Illinois ZIP; junk careOf
   possible. Amber flags mitigate. Fix: ZIP-prefix→state sanity table gating
   Strategy C's state pick (overlaps parked ZIP↔state idea).

7. COSMETIC — header badge v0.3 vs footer v0.4 (line ~137). One VERSION const.

8. MINOR — \r unquoted in CSV via hand-made batch JSON; Excel formula
   injection (=/+/@ prefix) if CSV opened in Excel; dead 'Phone number'
   branch; unit-keyword + person-name regexes duplicated 3×/2×; ms-wide
   remove/clear races (documented trade-off); buildShipRequest NaN weight
   guard needed before Phase-2 wiring.

## Compliance / PII (public repo + live Pages site)

- tickets/sample-tickets.json publishes 36 distinct real person names and
  29 street addresses (mostly RESIDENTIAL) on the public internet, plus the
  sender block and 11 technician names; three sample tickets with two real
  name+address pairs are baked into the live page itself.
- Risk: identifiable employees/ex-employees + home addresses, public.
  The private-repo migration exists for this; the public repo remains live.
- Options (Daniel decides): (a) anonymize the dataset wholesale (fake names/
  addresses exercising identical code paths — full re-pin, one careful
  session), (b) accelerate retiring the public repo/Pages in favor of the
  private repo + SharePoint, (c) accept until SharePoint go-live (status quo,
  documented). localStorage queue retention on shared machines: note for the
  team guide. Formal legal:compliance-check plugin run available once its
  connectors are authorized in claude.ai settings.

## Status

No fixes applied in this audit (findings-only). Fixes to land test-first,
one at a time, per house rules.

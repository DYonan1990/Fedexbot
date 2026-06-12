# Jumbled-address intake — design spec

Date: 2026-06-11
Status: approved by Daniel (brainstorming session); awaiting written-spec review
Owner: Daniel Yonan · Author: Claude session
Baseline: 35/35 green, day-one hardening + tail restore shipped

## Why

Techs receive addresses over Teams in whatever order the sender typed them.
Today the parser requires "City, ST ZIP" in that order and finds NOTHING in
any of these real shapes (verified against the current build — all four parse
to null):

1. `Daniel Yonan 4534 N Greenview 60640 Chicago IL`      (name first)
2. `4534 N Greenview 60640 Chicago IL Daniel Yonan`      (name last)
3. `Daniel Yonan` ⏎ `4534 N Greenview 60640 Chicago IL`  (name on own line)
4. `4534 n greenview 60640 daniel yonan chicago IL`      (lowercase, name mid)

The common defect tolerated: the ZIP floats directly after the street instead
of trailing the state. The parser gets a last-resort strategy that reassembles
these, plus pinned dataset tickets so the behavior can never regress.

A fifth real shape (verified: address parses today, name is LOST) is a
conversational return-request email with a comma-led name welded to a
canonical address, and a sign-off name that must not win:

5. `Cool.  Ray Lane, 41506 N Hudson Trail, Anthem, AZ 85086.  IF you provide
   a return label, after I ensure all is moved I'll ship the old back to
   you.  Thanks Dan.`
   → today: line1/city/state/zip correct, callerName null ("Ray Lane"
   dropped, and "Thanks Dan" must never be mistaken for the recipient).

## Non-goals

- No changes to Strategies A/B, structured-field parsing, or any existing
  named rule. The 35 pinned tickets stay byte-identical.
- No city/ZIP database, no network calls, no dependencies (scope locks).
- No title-casing or other normalization beyond the existing rules: typed
  case is kept; states uppercase; phones/emails per existing behavior.
- Company default already exists (TAG when no signal) — nothing to build.

## Strategy C — jumbled-line reassembly

Location: inside `parseAddressFromText`, executed only after Strategies A and
B produce nothing.

**Trigger — ALL must hold:**
- The full input is 1–3 non-empty lines.
- No conventional state+ZIP anchor matched anywhere in the text (Strategies
  A and B found no candidates).
- Exactly one 5-digit token exists in the text (the ZIP).
- A valid 2-letter US state token exists (case-insensitive, checked against
  US_STATES), not part of another word.

**Token classification (on the line containing the ZIP):**
- `zip` = the 5-digit token.
- `state` = the state token (uppercased on output).
- `line1` = the first token starting with 1–6 digits (street number) plus the
  words following it, cut at the ZIP token. Typed case kept.
- `city` = the single word immediately before the state token. Typed case
  kept. (Two-word cities in jumbled shapes are an accepted limitation — see
  Risks.)
- `name` = a run of 2–4 person-name words (letters, apostrophes, hyphens,
  periods only; no digits; rejects unit/PO keywords: PO, Box, Suite, Ste,
  Apt, Unit, Bldg, Building, Floor, Fl, Room, Rm), searched in this order:
  (a) a line of its own above the address line → plain `callerName`
      (Teams-message rule already covers the canonical version; Strategy C
      covers it when the address line itself is jumbled);
  (b) at the start of the address line, before the street number;
  (c) at the end, after the state;
  (d) mid-string between the ZIP and the city.
  For (b)(c)(d) — name embedded in the address — route through the existing
  careOf mechanism: `callerName` + `_addressNameRecipient`, consistent with
  the Address-name-is-recipient and Leading-name rules.
- `line2` = null. Items, phone, email, company, gate: existing rules
  (DEFAULT_PHONE + `_phoneDefaulted`, TAG default, gate `"none"`).

**Confidence:** every field Strategy C fills gets `low` confidence → amber
verify flags + the "Check before adding" summary. Guesswork must look like
guesswork to all 11 techs.

## Strategy A name-lookback (comma-led name before an inline street)

Separate, smaller mechanism for shape 5. When Strategy A's inline match
succeeds, look backwards from the street-number start in the same sentence
for a strict person-name run (same 2–4-word pattern and keyword exclusions
as Strategy C) immediately followed by a comma: `Ray Lane, 41506 …`. On
match, route the name through the existing careOf mechanism (`callerName` +
`_addressNameRecipient`). Adjacency is the safety: only the name TOUCHING
the street number qualifies, so greetings ("Cool."), sign-offs ("Thanks
Dan."), and other capitalized words elsewhere in the sentence can never be
picked. Name confidence `medium` (adjacency is strong evidence); address
confidence unchanged from Strategy A.

## Dataset additions (additions only; expected values Daniel-confirmed)

Four tickets, format `"teams"`, shared expected values (typed case kept):

| id | raw |
|---|---|
| JUMBLED-ADDR-001 | `Daniel Yonan 4534 N Greenview 60640 Chicago IL` |
| JUMBLED-ADDR-002 | `4534 N Greenview 60640 Chicago IL Daniel Yonan` |
| JUMBLED-ADDR-003 | `Daniel Yonan\n4534 N Greenview 60640 Chicago IL` |
| JUMBLED-ADDR-004 | `4534 n greenview 60640 daniel yonan chicago IL` |

Expected (001–003): callerName `"Daniel Yonan"`, line1 `"4534 N Greenview"`,
line2 null, city `"Chicago"`, state `"IL"`, zip `"60640"`, callerPhone
`"3154546000"` + `_phoneDefaulted` true, callerEmail null, company `"TAG"`,
items `[]`, shippingGate `"none"`, `_isNewHire` false. 001 and 002
additionally pin `_addressNameRecipient: "Daniel Yonan"` (embedded name);
003 pins callerName only (own-line name).

Expected (004): same but callerName `"daniel yonan"`,
`_addressNameRecipient: "daniel yonan"`, line1 `"4534 n greenview"`,
city `"chicago"`.

Fifth ticket, format `"email"`:

| id | raw |
|---|---|
| RETURN-REQ-002 | `Cool.  Ray Lane, 41506 N Hudson Trail, Anthem, AZ 85086.  IF you provide a return label, after I ensure all is moved I'll ship the old back to you.  Thanks Dan.` |

Expected: callerName `"Ray Lane"`, `_addressNameRecipient: "Ray Lane"`,
line1 `"41506 N Hudson Trail"`, line2 null, city `"Anthem"`, state `"AZ"`,
zip `"85086"`, callerPhone `"3154546000"` + `_phoneDefaulted` true,
callerEmail null, company `"TAG"`, items `[]` (the message names no device —
"the old" is not parseable; the tech picks items), shippingGate `"none"`,
`_isNewHire` false. The sign-off "Dan" must not appear in any name field.

## Testing and verification

1. Test-first: add the five tickets → `npm test` must FAIL exactly 35/40
   (the four jumbled shapes fully, RETURN-REQ-002 on callerName) →
   implement → **40/40 tickets passed.** exit 0, zero regressions.
2. Post-write file checks (CLAUDE.md rule from the truncation incident):
   `</script>` count is 1, file ends `</html>`, full inline script parses.
3. Rollout: sync app + tickets + CLAUDE.md + docs to the clone, commit, push;
   CI `regression` green; live click-test of JUMBLED-ADDR-001 on Pages with
   verify flags visible.

## Risks and containment

The trigger's strictness is the regression shield: every existing ticket
parses via structured fields or Strategies A/B (all have conventional
anchors), so Strategy C is unreachable for them. The suite proves it.
Two-word cities ("Oak Park") in jumbled shapes will misassign the city
boundary — accepted; when a real one appears, it gets pinned as ticket 40
and the heuristic gets refined test-first.

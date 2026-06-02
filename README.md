# FedEx QuickShip

Parses messy ServiceNow tickets (and forwarded emails, signatures, free text) into
validated FedEx shipments. The parser is **deterministic** — no external AI, no
company data leaves the machine.

This folder is set up so the parser keeps getting better as you feed it real
tickets: every ticket you add becomes a locked test that the parser must keep
satisfying. That's the "constantly learning" loop — see below.

## Layout

```
app/
  fedex_bot.html          The real app + the parser core (single source of truth)
tickets/
  sample-tickets.json     Golden dataset: raw ticket text + the exact expected parse
tests/
  load-parser.js          Pulls parseTicket() straight out of fedex_bot.html
  run-regression.js       Runs every ticket through the parser, diffs vs expected
docs/
  superpowers/specs/...   Design spec for the shared web-app version
```

## The learning loop

1. A new ticket comes in that the bot got wrong (or you want to lock in).
2. Add it to a dataset in `tickets/` with the **correct** expected output.
3. Run the suite: `npm test`. The new ticket fails (parser doesn't match yet).
4. Fix the parser inside `app/fedex_bot.html` until it passes — without breaking
   any other ticket.
5. Commit. That behavior is now pinned forever; no future change can silently
   regress it.

Because more tickets = more pinned behavior, the dataset *is* the bot's accumulated
knowledge. Grow it and the parser can only get more correct.

## Running the tests

```bash
npm test                              # run every dataset in tickets/
npm run test:verbose                  # also print the fields that passed
node tests/run-regression.js --id INC2231755     # one ticket
node tests/run-regression.js tickets/my-batch.json   # one dataset file
```

Exit code is `0` when everything passes, `1` if anything fails — so it drops
straight into a pre-commit hook or CI later.

The runner **extracts the parser directly from `app/fedex_bot.html`** every run.
There is no second copy of the parsing logic to keep in sync: you edit the app,
the tests test the app.

## Adding tickets

Each entry in a dataset looks like this:

```json
{
  "id": "INC2231755",
  "label": "April Walsh — laptop not charging",
  "format": "INC",
  "covers": ["what edge cases this ticket pins down"],
  "raw": "the full raw ticket text exactly as pasted into the bot",
  "expected": {
    "ticketNumber": "INC2231755",
    "callerName": "April Walsh",
    "callerEmail": "awalsh@aspendental.com",
    "company": "Aspen",
    "line1": "2511 W Queen Creek Rd.",
    "line2": "Unit 177",
    "city": "Chandler", "state": "AZ", "zip": "85248",
    "configurationItem": "ADMI-24744 / gm-06eh0t",
    "items": [{ "type": "laptop", "qty": 1 }],
    "shippingGate": "none"
  }
}
```

Rules of thumb for `expected`:

- **Only list the fields you care about.** The runner checks just the keys you put
  in `expected`; anything you omit is ignored. Start small.
- `items` is compared as a set — order doesn't matter.
- Use `null` when a field should genuinely be empty (e.g. a missing apartment line).
- `shippingGate`: `"open"` = "Is this being shipped: Yes", `"blocked"` = "...: No",
  `"none"` = no shipping-gate field present (typical INC).
- You can split tickets across multiple `*.json` files in `tickets/` (e.g. one file
  per month or per source) — `npm test` runs them all.

Field meanings are documented in `tickets/sample-tickets.json` under `field_notes`.

## Current status

`npm test` is **green — all 29 tickets pass**. The parser is aligned to the
dataset: new-hire detection (flavors A/B/C), shipping-gate resolution, email
lowercasing, the `DEFAULT_PHONE` fallback (`_phoneDefaulted`), configuration-item
extraction (structured field + inline `#` tags), multi-line address capture,
street/city splitting, and care-of (`%` / `c/o`) handling.

Wh
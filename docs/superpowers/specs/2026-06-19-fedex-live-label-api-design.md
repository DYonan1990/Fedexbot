# FedEx live label printing via API: design spec

Date: 2026-06-19
Status: approved in brainstorming session; awaiting written-spec review
Owner: Daniel Yonan, Desktop Support (PSC3), Aspen Dental · Author: Claude session
Baseline: app v0.3.0, dataset 40/40 green, single client-side file `app/fedex_bot.html`

## Why

Today QuickShip turns a messy ServiceNow ticket into a 29-column CSV. A tech then
opens FedEx Ship Manager and imports that CSV by hand to get a label. That hand-off
is the last manual step. Daniel wants the app to create the FedEx shipment directly
from a parsed ticket and print the 4x6 thermal label on the spot, ideally with no
print dialog, for all 11 PSC3 techs.

This spec covers that one capability: parsed ticket to printed label, end to end.

## Locked decisions (this session)

1. **Audience: the whole team.** Build for all 11 techs, not a solo proof-of-concept.
   The build still proves itself in the FedEx sandbox first (see Phasing); "team" is
   the target, not a skipped validation.
2. **Print: thermal Zebra, ZPL, auto-print.** Labels are 4x6 ZPL sent silently to a
   Zebra printer through Zebra Browser Print. No "Save as PDF then print" step.
3. **Triggers: per-ticket and batch.** A "Create + Print" button on each queued
   shipment, plus a "Create + Print All" for a whole batch.
4. **Backend: a Power Automate flow, OAuth-secured.** The flow holds nothing in the
   open. It is triggered with Entra ID OAuth (tenant-restricted) and called from the
   web part with AadHttpClient, never the default anonymous SAS URL. The FedEx secret
   lives in Azure Key Vault. (An Azure Function was recommended and declined; the
   premium-licensing cost and the OAuth requirement were accepted, with IT to confirm
   licensing entitlement before go-live.)
5. **v1 scope: create, print, reprint.** Voiding or cancelling a created shipment is a
   fast-follow phase, not v1.

## The invariant this changes, and the amendment

Scope lock 1 today reads "no frameworks, build steps, bundlers, servers, or databases;
the app stays one client-side HTML file." This work adds an external backend (the flow)
that the app talks to. Daniel approved that change in this session. The amendment is
narrow and explicit:

- **App logic still lives in exactly one file.** `app/fedex_bot.html` remains the only
  place parser and app logic live. Invariants 1, 4, and 5 (single source of truth,
  test-first parser changes, frozen shipping facts) are untouched. The dataset contract
  (invariant 2) and ship-only-green (invariant 3) stand.
- **The system now has one external piece: the flow.** It exists only to hold the FedEx
  secret and relay the call, because FedEx forbids putting the secret in the browser and
  blocks direct browser calls (no CORS). It does not parse, validate, or store anything.

## Architecture

The existing model is three jobs: store (repo), run (host), reach (Teams/SharePoint).
This adds a fourth, ship:

```
 Web part (browser)        Power Automate flow         FedEx Ship API
 parse + queue        ──▶  holds secret, calls    ──▶  creates the label
 build ship request        FedEx (OAuth secured)       returns ZPL + tracking
        ▲                                                     │
        └──────────  base64 ZPL label + tracking #  ◀─────────┘
        │
        ▼
 Browser Print (localhost agent)  ──▶  Zebra 4x6 printer  (auto-print)
```

The web part is the brain. The flow is a thin, secret-holding messenger. Browser Print
is the local bridge to the printer.

## Components

### A. App changes: `app/fedex_bot.html` (the only file with app logic)

- A "Create + Print" button on each queued shipment row, and a "Create + Print All"
  for the batch.
- A new client module (working name `shipClient`) that:
  1. builds the Ship API request from the already-parsed fields (a pure function,
     `buildShipRequest(parsedTicket)`),
  2. calls the flow with AadHttpClient (authenticated, audited),
  3. receives base64 ZPL plus the tracking number,
  4. decodes the ZPL and sends it to Browser Print,
  5. renders the tracking number and a Reprint button on that row.
- New UI is plain CSS in the existing `<style>` block, reusing baked utilities. Tailwind
  does not run at runtime (CLAUDE.md rule), so new class names would not style themselves.
- Label creation is **blocked** when the parser already flags the address as partial
  (`_addressPartial` / `_missingRequired`). The block reuses the existing verify-flag UI
  and states what is missing. No half-formed shipments reach FedEx.
- A duplicate guard: a row that already holds a tracking number is not re-created. A retry
  or double-click shows the existing tracking number instead of paying for a second label.
  Guard state lives in the existing per-browser localStorage queue.

### B. The Power Automate flow (new, outside the app)

- **Trigger:** "When an HTTP request is received," secured with Entra ID OAuth and
  restricted to the tenant. Not the anonymous SAS URL.
- **Step 1, token:** HTTP POST to the FedEx OAuth endpoint
  (`apis-sandbox.fedex.com/oauth/token` in sandbox, `apis.fedex.com` in production) using
  the client id and secret read from Key Vault. The token lasts about 60 minutes; cache and
  reuse where the platform allows.
- **Step 2, ship:** HTTP POST to `/ship/v1/shipments` with the shipment JSON and the bearer
  token. `labelResponseOptions: LABEL` so the label content comes back inline.
- **Step 3, response:** return `{ trackingNumber, encodedLabel (base64 ZPL), status, errors }`
  to the web part.
- **Licensing:** the HTTP trigger, the HTTP action, and the Response action are premium
  connectors. A premium license is required: roughly $15 per user per month, or a single
  Per-Flow (Process) plan near $500 per month covering all 11 techs on the one flow. IT
  confirms Aspen's existing Power Platform entitlement before go-live.

### C. Zebra Browser Print (new, per machine)

- Installed on each of the 11 machines. `BrowserPrint.js` is included in the app.
- The app sends raw ZPL to the selected Zebra printer, which prints silently (auto-print).
- If Browser Print is not running or not installed, the app detects it, says so in plain
  language, and offers a downloadable `.zpl` as a fallback so the tech is never stuck.

### D. Secrets and config

- FedEx client id, secret, and shipper account number live in Azure Key Vault, referenced
  by the flow. Never in the app, never in the repo.
- Sandbox versus production is config in the flow and Key Vault, not in the app.
- Reminder carried from this session: production keys never go in the public GitHub repo,
  which still serves Pages. The sandbox key shared in chat is low-stakes and can be
  regenerated in the FedEx portal if desired.

## Field mapping (parser output to Ship API)

The parser already emits everything the Ship API needs. The mapping is mechanical:

- recipient name / `_addressNameRecipient` to `recipients[0].contact.personName`
- company to `recipients[0].contact.companyName`
- phone (default 3154546000) to `recipients[0].contact.phoneNumber`
- line1 / line2 / city / state / zip to `recipients[0].address`
- weight to `requestedPackageLineItems[].weight` (LB)
- length / width / height to `requestedPackageLineItems[].dimensions` (IN)
- reference / ticket number to `requestedPackageLineItems[].customerReferences`
- frozen sender block to `requestedShipment.shipper` (constant)
- service default PRIORITY_OVERNIGHT to `serviceType`; YOUR_PACKAGING to `packagingType`
- payment SENDER, payor account = Aspen account number (from Key Vault)
- label to `labelSpecification`: `labelStockType STOCK_4X6`, `imageType ZPLII`,
  `labelFormatType COMMON2D`

Standard Equipment, which already expands to three CSV rows with reference suffixes,
becomes three packages and three labels, suffixes preserved. Custom equipment uses the
typed weight and dimensions, exactly as today.

Two Ship API fields are not in the 29-column model yet and need a confirmed default:
`pickupType` (proposed default: drop-off at a FedEx location) and `shipDatestamp`
(proposed default: today). Both are listed as open questions.

## Error handling and edge cases

- **Partial address:** blocked before any call, with the missing fields named.
- **FedEx errors** (address not validated, service unavailable, invalid field): surfaced
  on the row in FedEx's own words. Nothing prints.
- **Token or flow failure, timeout:** a clear retry message. The duplicate guard ensures a
  retry never creates a second paid shipment.
- **Printer offline or Browser Print missing:** detected, explained, `.zpl` fallback offered.
- **Batch:** each row reports its own result. One failure does not abort the rest. A summary
  shows how many were created and how many failed, with the failures listed.

## Testing and verification

- **The parser regression stays the gate:** `npm test` ends `40/40 tickets passed.` exit 0
  before any commit. No edits to `tickets/`.
- **The mapping is testable offline.** `buildShipRequest` is a pure function: parsed ticket
  in, Ship API payload out, no network. It is unit-tested with golden expected payloads,
  extracted from the HTML the same way `tests/load-parser.js` extracts the parser, so the
  single-source-of-truth invariant holds (no second copy of the logic).
- **Live calls are proven by hand in the sandbox first**, against test account 740561073,
  before any production credential exists.
- **After any write to `app/fedex_bot.html`:** the tail check from the truncation incident
  runs: exactly one `</script>`, file ends with `</html>`, the whole inline script parses.
  `npm test` alone does not prove the page loads.

## Phasing

1. **Sandbox proof.** Build the flow, the mapping, and the Browser Print wiring against
   `apis-sandbox.fedex.com` with test account 740561073. Success is one real ZPL label
   printing on a Zebra from a parsed ticket.
2. **Harden.** Error handling, partial-address block, duplicate guard, reprint, batch,
   offline-printer fallback.
3. **Go-live.** IT confirms licensing, swaps production FedEx credentials into Key Vault,
   pushes Browser Print to the 11 machines, pilots with one or two techs, then opens to all.
4. **Fast-follow (not v1).** Void / cancel a created shipment.

## Who does what (environment)

- This machine cannot reach Azure, the tenant, or github.com. The flow, the Key Vault
  secret, and the Entra app registration are built by Daniel or IT, from exact click-by-click
  instructions produced in the implementation plan. Claude never claims to have performed a
  tenant step.
- App changes are made by Claude in the canonical repo and pushed via the existing workflow
  (Daniel reviews the diff in GitHub Desktop, commits, pushes; CI re-runs the suite).

## Out of scope (parked)

- Void / cancel (Phase 4).
- Rate quoting, address validation as a separate step, tracking or notifications beyond the
  returned number, an address book, multi-carrier, and return labels (return labels already
  have their own parked brainstorm).

## Open questions

- **Zebra model and connection.** Which Zebra printers do the 11 machines use, and are they
  USB or networked? This sets the Browser Print configuration.
- **Power Platform licensing.** Does Aspen already hold premium Power Automate licensing, or
  is this new spend to approve?
- **Production FedEx account.** Is 740561073 the production shipper account too, or does a
  separate production account and meter apply? Where do the production credentials come from?
- **Flow ownership and Key Vault.** Who owns the flow (Daniel or a service account), and in
  which subscription does the Key Vault live?
- **Two new defaults to confirm:** `pickupType` (drop-off at a FedEx location?) and the ship
  date (today?).

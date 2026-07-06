# FedEx Live Label via API — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a queued shipment into a FedEx Ship API request and prove one real 4x6 ZPL label prints from the FedEx **sandbox** — without touching the parser, without putting any secret in the app, and without any IT dependency.

**Architecture:** Add one pure function, `buildShipRequest(row)`, to the already-extractable region of `app/fedex_bot.html`. It takes a queue row (the exact object `buildCsv` already serializes) and returns a FedEx Ship API JSON body, minus the account number, which the backend flow injects later. The function is unit-tested offline with golden payloads, extracted the same way `tests/load-parser.js` extracts the parser. The live call to FedEx is a manual runbook Daniel runs by hand (this machine cannot reach FedEx).

**Tech Stack:** Plain ES5-compatible JavaScript inside the single HTML file. Node's built-in `assert` + `vm` for tests (no new dependencies). FedEx Ship API v1 (`/ship/v1/shipments`), sandbox host `apis-sandbox.fedex.com`.

**Source spec:** `docs/superpowers/specs/2026-06-19-fedex-live-label-api-design.md` (approved in-session, design reaffirmed by Daniel 2026-06-19).

---

## Scope of this plan

Phase 1 only: the offline mapping function and the manual sandbox proof. This is a self-contained, testable unit that produces value on its own (a verifiable, correct FedEx payload) and de-risks everything downstream before any money or IT ticket is spent.

**In scope (this plan):**
- `buildShipRequest(row)` pure function + golden unit tests (outbound, return, multi-package).
- Export wiring in `tests/load-parser.js`.
- A `tests/ship-request.test.js` runner (mirrors `tests/persistence.test.js`).
- A manual runbook to print one real sandbox label.

**Out of scope (later phases, outlined at the end, NOT built here):**
- The Power Automate flow (holds the secret, calls FedEx). Built by Daniel/IT from instructions.
- Zebra Browser Print wiring and the `Create + Print` / `Create + Print All` buttons.
- Partial-address block, duplicate-tracking guard, reprint, batch summary, offline-printer fallback.
- Void / cancel (Phase 4 in the spec).

---

## Design decisions locked by reading the code

These refine the spec against what the app actually does. Read them before writing any task.

1. **The input is a queue row, not the raw parse.** The spec wrote `buildShipRequest(parsedTicket)`. The real ship-ready unit is a **queue row** — the object pushed in `app/fedex_bot.html` (the two `newRows.push({...})` sites) and consumed by `buildCsv()`. One row is already one package: Standard Equipment and multi-qty items are pre-expanded into one row per label, each with its own `reference` suffix (`-1`, `-2`, `-RTN`). Returns are already encoded as a normal forward shipment with sender and recipient swapped. So `buildShipRequest` is `buildCsv`'s sibling: same input, FedEx JSON out instead of a CSV line. It needs no knowledge of returns, expansion, or the parser.

2. **The exact row shape (the contract for this function):**
   ```
   reference, serviceType, shipmentType ('OUTBOUND'|'RETURN'),
   senderContactName, senderCompany, senderContactNumber,
   senderLine1, senderLine2, senderCity, senderState, senderPostcode, senderCountry, senderEmail,
   recipientContactName, recipientContactNumber,
   recipientLine1, recipientLine2, recipientCity, recipientState, recipientPostcode, recipientCountry,
   numberOfPackages (always 1), packageWeight (number), weightUnits ('LBS'),
   length, width, height (numbers), packageType ('YOUR_PACKAGING'), currencyType ('USD'),
   _itemLabel, _mode, _ci, [_pairedWith]
   ```
   Note: there is **no** `recipientCompany` field in the row or the 29-column CSV. Recipient company never appears on the label today. That is an existing modeling choice; do not invent it here (parked, see Known limitations).

3. **The account number never enters the app.** FedEx requires a top-level `accountNumber.value` on the ship request. `buildShipRequest` deliberately **omits** it. The Power Automate flow injects it from Key Vault before forwarding to FedEx. This keeps the shipper account out of the browser and the public repo. For the manual sandbox proof, Daniel pastes the sandbox account number into the request himself.

4. **Two values are not in the row and need a default:** `shipDatestamp` and `pickupType`. `buildShipRequest(row, opts)` takes them via an optional second argument so tests can pin a fixed date. Defaults: `shipDate` = today (`YYYY-MM-DD`), `pickupType` = `DROPOFF_AT_FEDEX_LOCATION`. **Both are flagged for Daniel to confirm before go-live** (see Open questions) — they do not affect whether a sandbox label prints.

5. **Placement.** `buildShipRequest` goes in the pure-helper region (between `const STORAGE_KEY` at line 495 and `const $ = id => document.getElementById` at line 1939), next to `dedupeQueueByReference` / `mergeForPersist` / `serializeBatch` (lines 954–975). It must use **no** DOM or `$()` so it stays extractable and runs in the test sandbox.

6. **`weightUnits` translates.** The row uses `'LBS'`; the FedEx Ship API wants `'LB'`. The function maps `LBS`→`LB` (and `KGS`→`KG` defensively). This is pinned by a test.

---

## File structure

- **Modify:** `app/fedex_bot.html` — add `buildShipRequest` in the pure-helper region (~line 980, right after `parseBatchFile`). Bump version string `0.4.0`→`0.5.0` and footer/report stamp `v0.4`→`v0.5` only in the final task, after green.
- **Modify:** `tests/load-parser.js` — export `buildShipRequest` behind a `typeof` guard, exactly like the queue helpers.
- **Create:** `tests/ship-request.test.js` — node runner with three golden checks. Mirrors the style of `tests/persistence.test.js`.
- **Untouched:** `tickets/*.json` (the parser gate stays 40/40), `tests/run-regression.js`, `.github/workflows/`.

---

## Task 1: `buildShipRequest(row)` — outbound mapping (TDD)

**Files:**
- Modify: `tests/load-parser.js` (export the new function)
- Create: `tests/ship-request.test.js`
- Modify: `app/fedex_bot.html` (add the function in the pure-helper region)

- [ ] **Step 1: Export the function from the test loader**

In `tests/load-parser.js`, extend the `this.queueHelpers` block so the new function is surfaced (it stays `undefined` during the RED phase thanks to the `typeof` guard, so nothing breaks before it exists). Change the injected code string to add one line:

```js
  vm.runInContext(
    code +
      '\n;this.parseTicket = parseTicket;\n;this.normalizePhone = normalizePhone;\n' +
      ';this.queueHelpers = {' +
      ' mergeForPersist: (typeof mergeForPersist !== "undefined") ? mergeForPersist : undefined,' +
      ' dedupeQueueByReference: (typeof dedupeQueueByReference !== "undefined") ? dedupeQueueByReference : undefined,' +
      ' serializeBatch: (typeof serializeBatch !== "undefined") ? serializeBatch : undefined,' +
      ' parseBatchFile: (typeof parseBatchFile !== "undefined") ? parseBatchFile : undefined,' +
      ' buildShipRequest: (typeof buildShipRequest !== "undefined") ? buildShipRequest : undefined' +
      ' };\n',
    sandbox,
    { filename: 'fedex_bot.parser.js' }
  );
```

- [ ] **Step 2: Write the failing test**

Create `tests/ship-request.test.js`:

```js
'use strict';

// ============================================================================
// ship-request.test.js
// ----------------------------------------------------------------------------
// Golden tests for buildShipRequest(row, opts): a queue row (the same object
// buildCsv serializes) -> a FedEx Ship API request body (minus the account
// number, which the backend flow injects). Pure function, no network, no DOM.
// The function is pulled out of app/fedex_bot.html by load-parser.js, so there
// is no second copy of the logic.
// ============================================================================

const assert = require('assert');
const { queueHelpers } = require('./load-parser');
const buildShipRequest = queueHelpers.buildShipRequest;

let checks = 0;
const ok = (name) => { checks++; console.log('  PASS  ' + name); };

assert.strictEqual(typeof buildShipRequest, 'function',
  'buildShipRequest must be exported from app/fedex_bot.html via load-parser.js');

// ---- 1. Outbound: Aspen -> customer -----------------------------------------
const outboundRow = {
  reference: 'INC2231755',
  serviceType: 'PRIORITY_OVERNIGHT',
  shipmentType: 'OUTBOUND',
  senderContactName: 'Daniel Yonan',
  senderCompany: 'Aspen Dental',
  senderContactNumber: '3154546000',
  senderLine1: '813 W Wayman St',
  senderLine2: '17TH FLOOR',
  senderCity: 'Chicago',
  senderState: 'IL',
  senderPostcode: '60607',
  senderCountry: 'US',
  senderEmail: 'shippinghelp@aspendental.com',
  recipientContactName: 'April Walsh',
  recipientContactNumber: '5209078985',
  recipientLine1: '2511 W Queen Creek Rd.',
  recipientLine2: 'Unit 177',
  recipientCity: 'Chandler',
  recipientState: 'AZ',
  recipientPostcode: '85248',
  recipientCountry: 'US',
  numberOfPackages: 1,
  packageWeight: 5,
  weightUnits: 'LBS',
  length: 15, width: 11, height: 4,
  packageType: 'YOUR_PACKAGING',
  currencyType: 'USD',
  _itemLabel: 'Laptop', _mode: 'outbound', _ci: 'ADMI-24744'
};

const expectedOutbound = {
  labelResponseOptions: 'LABEL',
  requestedShipment: {
    shipper: {
      contact: { personName: 'Daniel Yonan', phoneNumber: '3154546000', companyName: 'Aspen Dental' },
      address: { streetLines: ['813 W Wayman St', '17TH FLOOR'], city: 'Chicago', stateOrProvinceCode: 'IL', postalCode: '60607', countryCode: 'US' }
    },
    recipients: [{
      contact: { personName: 'April Walsh', phoneNumber: '5209078985' },
      address: { streetLines: ['2511 W Queen Creek Rd.', 'Unit 177'], city: 'Chandler', stateOrProvinceCode: 'AZ', postalCode: '85248', countryCode: 'US' }
    }],
    shipDatestamp: '2026-06-19',
    serviceType: 'PRIORITY_OVERNIGHT',
    packagingType: 'YOUR_PACKAGING',
    pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
    blockInsightVisibility: false,
    shippingChargesPayment: { paymentType: 'SENDER' },
    labelSpecification: { labelStockType: 'STOCK_4X6', imageType: 'ZPLII', labelFormatType: 'COMMON2D' },
    requestedPackageLineItems: [{
      weight: { units: 'LB', value: 5 },
      dimensions: { length: 15, width: 11, height: 4, units: 'IN' },
      customerReferences: [{ customerReferenceType: 'CUSTOMER_REFERENCE', value: 'INC2231755' }]
    }]
  }
};

assert.deepStrictEqual(
  buildShipRequest(outboundRow, { shipDate: '2026-06-19' }),
  expectedOutbound
);
ok('outbound row maps to the FedEx Ship request (LBS->LB, line2 kept, no recipient company, no account number)');

console.log('\n' + checks + '/' + checks + ' ship-request checks passed.');
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `node tests/ship-request.test.js`
Expected: throws on the `typeof buildShipRequest === 'function'` assertion (the function does not exist yet).

- [ ] **Step 4: Implement `buildShipRequest`**

In `app/fedex_bot.html`, immediately after the `parseBatchFile` helper (~line 980, still well above the `const $ = id =>` marker at line 1939), add:

```js
// =================================================================
// FEDEX SHIP REQUEST  (pure: queue row -> Ship API body)
// -----------------------------------------------------------------
// Sibling of buildCsv(): same queue row in, FedEx Ship API JSON out.
// Deliberately OMITS the shipper account number — the backend flow
// injects accountNumber.value from Key Vault. No secret ever lives
// in this file. No DOM use, so it stays unit-testable offline.
// shipDate / pickupType are injected (default today / drop-off);
// both are CONFIRM-before-go-live (see plan + spec open questions).
// =================================================================
function buildShipRequest(row, opts) {
  opts = opts || {};
  var shipDate = opts.shipDate || new Date().toISOString().slice(0, 10);
  var pickupType = opts.pickupType || 'DROPOFF_AT_FEDEX_LOCATION';

  function streetLines(a, b) {
    return [a, b]
      .map(function (s) { return s == null ? '' : String(s).trim(); })
      .filter(function (s) { return s.length > 0; });
  }
  function contact(name, phone, company) {
    var c = { personName: name, phoneNumber: phone };
    if (company && String(company).trim()) c.companyName = String(company).trim();
    return c;
  }
  var units = String(row.weightUnits || 'LBS').toUpperCase() === 'KGS' ? 'KG' : 'LB';

  return {
    labelResponseOptions: 'LABEL',
    requestedShipment: {
      shipper: {
        contact: contact(row.senderContactName, row.senderContactNumber, row.senderCompany),
        address: {
          streetLines: streetLines(row.senderLine1, row.senderLine2),
          city: row.senderCity,
          stateOrProvinceCode: row.senderState,
          postalCode: row.senderPostcode,
          countryCode: row.senderCountry || 'US'
        }
      },
      recipients: [{
        contact: contact(row.recipientContactName, row.recipientContactNumber, row.recipientCompany),
        address: {
          streetLines: streetLines(row.recipientLine1, row.recipientLine2),
          city: row.recipientCity,
          stateOrProvinceCode: row.recipientState,
          postalCode: row.recipientPostcode,
          countryCode: row.recipientCountry || 'US'
        }
      }],
      shipDatestamp: shipDate,
      serviceType: row.serviceType,
      packagingType: row.packageType,
      pickupType: pickupType,
      blockInsightVisibility: false,
      shippingChargesPayment: { paymentType: 'SENDER' },
      labelSpecification: {
        labelStockType: 'STOCK_4X6',
        imageType: 'ZPLII',
        labelFormatType: 'COMMON2D'
      },
      requestedPackageLineItems: [{
        weight: { units: units, value: parseFloat(row.packageWeight) },
        dimensions: {
          length: parseInt(row.length, 10),
          width: parseInt(row.width, 10),
          height: parseInt(row.height, 10),
          units: 'IN'
        },
        customerReferences: [
          { customerReferenceType: 'CUSTOMER_REFERENCE', value: row.reference }
        ]
      }]
    }
  };
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `node tests/ship-request.test.js`
Expected: `PASS  outbound row maps to the FedEx Ship request ...` then `1/1 ship-request checks passed.`

- [ ] **Step 6: File-integrity drill (mandatory after any write to `app/fedex_bot.html`)**

Run:
```bash
grep -c '</script>' "app/fedex_bot.html"      # expect: 1
tail -c 40 "app/fedex_bot.html"               # expect: ends with </html>
node -e "const fs=require('fs');const h=fs.readFileSync('app/fedex_bot.html','utf8');const s=h.indexOf('<script>');const e=h.lastIndexOf('</script>');new Function(h.slice(s+8,e));console.log('inline script parses OK');"
```
Expected: prints `1`, shows `</html>`, prints `inline script parses OK`.

- [ ] **Step 7: Confirm the parser gate is untouched**

Run: `npm test`
Expected: `40/40 tickets passed.` exit 0.

- [ ] **Step 8: Commit**

```bash
git add app/fedex_bot.html tests/load-parser.js tests/ship-request.test.js
git commit -m "feat: buildShipRequest(row) outbound mapping + golden test (Phase 1)"
```

---

## Task 2: Return rows map with no special-casing (TDD)

A return row is a normal forward shipment with sender and recipient already swapped (sender = customer, recipient = the PSC3 hub) and `senderCompany: ''`. This task proves `buildShipRequest` needs no `shipmentType` branch and that an empty company is omitted (not emitted as `companyName: ''`).

**Files:**
- Modify: `tests/ship-request.test.js`

- [ ] **Step 1: Add the failing return check**

Append to `tests/ship-request.test.js`, before the final `console.log`:

```js
// ---- 2. Return: customer -> PSC3 hub (parties pre-swapped, empty company) ----
const returnRow = {
  reference: 'INC2231755-RTN',
  serviceType: 'PRIORITY_OVERNIGHT',
  shipmentType: 'RETURN',
  senderContactName: 'April Walsh',
  senderCompany: '',
  senderContactNumber: '5209078985',
  senderLine1: '2511 W Queen Creek Rd.',
  senderLine2: 'Unit 177',
  senderCity: 'Chandler', senderState: 'AZ', senderPostcode: '85248', senderCountry: 'US', senderEmail: '',
  recipientContactName: 'Desktop Support PSC3-Daniel Yonan',
  recipientContactNumber: '3154546000',
  recipientLine1: '813 W Wayman St', recipientLine2: '17TH FLOOR',
  recipientCity: 'Chicago', recipientState: 'IL', recipientPostcode: '60607', recipientCountry: 'US',
  numberOfPackages: 1, packageWeight: 5, weightUnits: 'LBS', length: 15, width: 11, height: 4,
  packageType: 'YOUR_PACKAGING', currencyType: 'USD',
  _itemLabel: 'Laptop', _mode: 'return', _pairedWith: 'INC2231755', _ci: ''
};

const returnReq = buildShipRequest(returnRow, { shipDate: '2026-06-19' });

assert.deepStrictEqual(returnReq.requestedShipment.shipper.contact,
  { personName: 'April Walsh', phoneNumber: '5209078985' },
  'empty senderCompany must be omitted, not emitted as companyName: ""');
assert.deepStrictEqual(returnReq.requestedShipment.recipients[0].contact,
  { personName: 'Desktop Support PSC3-Daniel Yonan', phoneNumber: '3154546000' });
assert.strictEqual(returnReq.requestedShipment.recipients[0].address.city, 'Chicago');
assert.strictEqual(
  returnReq.requestedShipment.requestedPackageLineItems[0].customerReferences[0].value,
  'INC2231755-RTN');
ok('return row maps with parties already swapped and -RTN reference preserved');
```

Also update the final summary line counter (it already prints `checks/checks`, so no change needed there).

- [ ] **Step 2: Run, verify pass (characterization — the general function already covers it)**

Run: `node tests/ship-request.test.js`
Expected: both checks PASS, `2/2 ship-request checks passed.`

If `shipper.contact` comes back with `companyName: ''`, the function's `contact()` guard is wrong — fix it so an empty/whitespace company is omitted, then re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/ship-request.test.js app/fedex_bot.html
git commit -m "test: return-row golden for buildShipRequest (party swap + empty company omitted)"
```

---

## Task 3: Multi-package reference suffix is preserved (TDD)

Standard Equipment expands to three rows (`BASE-1`, `BASE-2`, `BASE-3`). Each row is mapped independently into its own single-package label. This pins that the suffix survives onto the FedEx `customerReferences` value.

**Files:**
- Modify: `tests/ship-request.test.js`

- [ ] **Step 1: Add the failing multi-package check**

Append before the final `console.log`:

```js
// ---- 3. Multi-package expansion: BASE-2 keeps its suffix ---------------------
const secondPackageRow = Object.assign({}, outboundRow, {
  reference: 'RITM1049891-2',
  _itemLabel: 'iPad',
  packageWeight: 2,
  length: 12, width: 9, height: 2
});

const req3 = buildShipRequest(secondPackageRow, { shipDate: '2026-06-19' });
const pkg3 = req3.requestedShipment.requestedPackageLineItems[0];

assert.strictEqual(pkg3.customerReferences[0].value, 'RITM1049891-2',
  'multi-package reference suffix must be preserved verbatim');
assert.deepStrictEqual(pkg3.weight, { units: 'LB', value: 2 });
assert.deepStrictEqual(pkg3.dimensions, { length: 12, width: 9, height: 2, units: 'IN' });
ok('multi-package row keeps its -2 reference and its own weight/dimensions');
```

- [ ] **Step 2: Run, verify pass**

Run: `node tests/ship-request.test.js`
Expected: `3/3 ship-request checks passed.`

- [ ] **Step 3: Commit**

```bash
git add tests/ship-request.test.js
git commit -m "test: multi-package suffix golden for buildShipRequest"
```

---

## Task 4: Version bump + final verification

Only after Tasks 1–3 are green.

**Files:**
- Modify: `app/fedex_bot.html` (version string + footer/report stamp), `package.json` (version)

- [ ] **Step 1: Bump the version**

In `app/fedex_bot.html`, change the app version `0.4.0`→`0.5.0` and the footer/report stamp `v0.4`→`v0.5` (search those exact strings). In `package.json`, change `"version": "0.4.0"` to `"0.5.0"`.

- [ ] **Step 2: Full gate + integrity drill**

```bash
npm test
node tests/persistence.test.js
node tests/ship-request.test.js
grep -c '</script>' "app/fedex_bot.html"
tail -c 40 "app/fedex_bot.html"
node -e "const fs=require('fs');const h=fs.readFileSync('app/fedex_bot.html','utf8');const s=h.indexOf('<script>');const e=h.lastIndexOf('</script>');new Function(h.slice(s+8,e));console.log('inline script parses OK');"
```
Expected: `40/40 tickets passed.` exit 0; `8/8` persistence; `3/3` ship-request; `1`; `</html>`; `inline script parses OK`.

- [ ] **Step 3: Commit**

```bash
git add app/fedex_bot.html package.json
git commit -m "chore: bump QuickShip to v0.5.0 (buildShipRequest mapping landed)"
```

---

## Manual runbook: prove one real sandbox label (Daniel, off this machine)

This machine cannot reach FedEx, so the live call is done by hand. No code here; this is the Phase 1 "done" proof. Use the FedEx **sandbox** only.

- [ ] **R1: Generate a real payload to send.** With the queue holding one shipment, run this from the repo to print the exact JSON `buildShipRequest` produces for the first row:
  ```bash
  node -e "const {queueHelpers}=require('./tests/load-parser');const row=require('./tests/_sample-row.json');console.log(JSON.stringify(queueHelpers.buildShipRequest(row),null,2));"
  ```
  *Verify:* it prints a JSON body with `requestedShipment` and **no** `accountNumber`.
  *(If you prefer not to keep a `_sample-row.json`, copy the `outboundRow` object from `tests/ship-request.test.js` into a scratch file. This step is throwaway.)*

- [ ] **R2: Get a sandbox OAuth token.** In Postman (or curl on a machine with internet), POST to `https://apis-sandbox.fedex.com/oauth/token` with `grant_type=client_credentials`, your sandbox `client_id`, and `client_secret` (from the FedEx Developer Portal project).
  *Verify:* the response contains an `access_token`.

- [ ] **R3: Add the account number and ship.** POST the R1 JSON to `https://apis-sandbox.fedex.com/ship/v1/shipments` with header `Authorization: Bearer <token>`, after adding the top-level field the flow will later inject:
  ```json
  "accountNumber": { "value": "<your sandbox account number>" }
  ```
  so the body is `{ "accountNumber": {...}, "labelResponseOptions": "LABEL", "requestedShipment": {...} }`.
  *Verify:* the response has a `trackingNumber` and a `pieceResponses[0].packageDocuments[0].encodedLabel` (base64 ZPL).

- [ ] **R4: Print it.** Decode the base64 `encodedLabel` to a `.zpl` file and send it to the Zebra (drag to the printer share, or `copy /b label.zpl \\printer` on Windows), or paste the ZPL into Labelary (`labelary.com`) to preview the 4x6.
  *Verify:* a correct 4x6 label renders/prints with the right recipient, return address, weight, and reference.

- [ ] **R5: Record the result** in `CLAUDE.md` (tracking number, account used, date). Phase 1 is done when one real sandbox label has printed.

---

## Known limitations (intentional, parked)

- **No recipient company on the label.** The 29-column model and the queue row have no `recipientCompany`; `buildShipRequest` mirrors that. If labels should show the customer's company (e.g., "Lovet Pet Health Care"), that is a row/parser change with its own test-first ticket — not this plan.
- **Single piece per call.** Each row is one package by construction, so each label is a separate Ship API call. Batch is a later-phase UI concern, not a payload concern.
- **No address validation pre-check.** The partial-address block (Phase 2) is what stops half-formed shipments; `buildShipRequest` assumes a complete row.

## Open questions (confirm before go-live, not before Phase 1)

- `pickupType`: default `DROPOFF_AT_FEDEX_LOCATION` — correct, or scheduled pickup?
- `shipDatestamp`: default today — correct, or next business day?
- Sandbox account `740561073`: is it also the production shipper account, or does production use a different account + meter?

## Later phases (outline only — depend on IT, built from instructions, not in this plan)

1. **Power Automate flow.** HTTP trigger secured with Entra ID OAuth (tenant-restricted), reads FedEx client id/secret/account from Key Vault, gets a token, POSTs `buildShipRequest` output (with `accountNumber` injected) to `/ship/v1/shipments`, returns `{ trackingNumber, encodedLabel, status, errors }`. Premium connector licensing — IT confirms entitlement. Delivered as click-by-click steps for Daniel/IT.
2. **App wiring + UI.** `shipClient` module: `Create + Print` per row and `Create + Print All` per batch, call the flow with `AadHttpClient`, decode ZPL, hand to Browser Print, render tracking number + `Reprint`. New styles are plain CSS in the existing `<style>` block (Tailwind does not run at runtime).
3. **Guards + resilience.** Block when `_addressPartial` / `_missingRequired`; duplicate guard (a row with a tracking number is never re-created); printer-offline / Browser-Print-missing detection with a `.zpl` download fallback; per-row batch results with a summary.
4. **Go-live.** IT swaps production credentials into Key Vault, Browser Print pushed to the 11 machines, pilot with one or two techs, then open to all.
5. **Fast-follow.** Void / cancel a created shipment.

---

## Self-review

- **Spec coverage (Phase 1 slice):** mapping function ✓ (Component A buildShipRequest), pure/testable-offline ✓ (Testing section), single-source-of-truth extraction ✓ (load-parser export), account number out of the app ✓ (Secrets section), STOCK_4X6 / ZPLII / COMMON2D label spec ✓, reference suffixes preserved ✓ (Standard Equipment note), sandbox proof against the test account ✓ (Phasing step 1). Later-phase items are explicitly deferred, matching the spec's Phasing.
- **Placeholders:** none. Every step has real code or a real command with expected output. The only `<...>` are runbook values only Daniel holds (his sandbox client_id/secret/account), which must not be written down in the repo.
- **Type/name consistency:** row field names match the two `newRows.push` sites and `buildCsv` headers exactly; `buildShipRequest(row, opts)` signature, `shipDate` / `pickupType` opts, and `queueHelpers.buildShipRequest` export name are used identically across the loader, the three tests, and the runbook.

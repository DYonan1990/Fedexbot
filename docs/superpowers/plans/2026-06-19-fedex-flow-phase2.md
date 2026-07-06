# FedEx Live Label via API: Phase 2 (the Power Automate flow)

> **How this plan is executed:** This machine cannot reach the Microsoft tenant, Azure, or FedEx. Every task below is done by Daniel or IT in the M365 and Azure web portals, not by an agentic worker and not in code. Steps use checkboxes (`- [ ]`). Each step has a `Verify:` line with the expected result. Do not mark a step done until its Verify passes.

**Goal:** Build the backend flow that holds the FedEx secret, calls the FedEx Ship API, and returns the ZPL label and tracking number to the app, secured so only Aspen tenant users can call it. Prove it end to end against the FedEx sandbox.

**Architecture:** One Power Automate instant cloud flow. The trigger "When an HTTP request is received" is restricted to the tenant with Microsoft Entra ID OAuth (not the anonymous URL). The flow reads the FedEx client id, secret, and account number from Azure Key Vault, gets a FedEx OAuth token, posts the app's ship request (with the account number injected) to `/ship/v1/shipments`, and returns `trackingNumber`, `encodedLabel`, `status`, and `errors`. The app is not changed in this plan.

**Tech Stack:** Power Automate premium connectors (HTTP, Response, Azure Key Vault), Azure Key Vault, FedEx Ship API v1, FedEx OAuth 2.0 client_credentials.

**Source spec:** `docs/superpowers/specs/2026-06-19-fedex-live-label-api-design.md` (approved, reaffirmed 2026-06-19).

**Where this sits:** Phase 1 (`buildShipRequest` mapping) is built and green (`3/3` ship-request, `40/40` parser, `8/8` persistence). This plan builds the flow. The app buttons, Zebra Browser Print, and the address and duplicate guards are the next plan (App wiring), which depends on this flow existing.

---

## Locked decisions carried from the spec

1. Backend is a Power Automate flow, not an Azure Function (spec decision 4).
2. The trigger is Entra ID OAuth, tenant-restricted. Never the anonymous "Anyone" URL (spec decision 4).
3. The FedEx client id, secret, and account number live in Azure Key Vault. They never enter the app or the repo (spec Secrets section).
4. The flow injects `accountNumber`. The app omits it on purpose (Phase 1 plan decision 3).
5. Sandbox is proven first. Production credentials come later, after FedEx label certification.

---

## Task 0: Confirm prerequisites (no build yet)

- [ ] **Premium licensing.** Confirm Aspen's Power Automate entitlement covers premium connectors (HTTP, Response, Azure Key Vault). Two ways to license: per user near $15 per user per month across the 11 techs, or one Per-Flow (Process) plan near $500 per month on this single flow.
  Verify: IT confirms in writing which plan applies and that it covers the three premium connectors.
- [ ] **Azure and Key Vault owner.** Identify the Azure subscription and who can create a Key Vault or grant access to one.
  Verify: you know the subscription and the person who can create or grant the vault.
- [ ] **Trigger OAuth availability.** Microsoft notes the HTTP-trigger Entra OAuth parameter is still rolling out by region.
  Verify: in Task 3 the "Who can trigger the flow?" parameter shows "Any user in my tenant" and "Specific users in my tenant". If it does not appear, stop and raise it with IT before building further.
- [ ] **Two defaults (spec open questions).** Confirm `pickupType` (proposed `DROPOFF_AT_FEDEX_LOCATION`) and `shipDatestamp` (proposed today).
  Verify: Daniel confirms both, or gives the correct values.

---

## Task 1: Prove the sandbox label by hand (prerequisite for Task 4)

- [ ] Follow `docs/superpowers/runbooks/2026-06-19-fedex-sandbox-label-proof.md` end to end.
  Verify: a 4x6 label renders on Labelary or prints on a Zebra, and you saved the full response as `sandbox-ship-response.json`. Task 4 builds the Parse JSON step from that file.

---

## Task 2: Key Vault and secrets

- [ ] Create or choose an Azure Key Vault, for example `kv-fedex-quickship`.
  Verify: the vault opens in the Azure portal and you can add secrets.
- [ ] Add three secrets, sandbox values first: `fedex-client-id`, `fedex-client-secret`, `fedex-account-number`.
  Verify: all three list under Secrets with an enabled status.
- [ ] Grant the identity the flow will use to read secrets. If you connect the Key Vault action with a service principal (recommended) or your user account, give it the "Key Vault Secrets User" role (RBAC), or a Get secret access policy.
  Verify: that identity shows the role or access policy on the vault.

---

## Task 3: Create the flow and lock the trigger to the tenant

- [ ] In Power Automate, select Create, then Instant cloud flow, then trigger "When an HTTP request is received". Name it `FedEx QuickShip - Create Label`.
  Verify: the flow opens with the request trigger.
- [ ] In the trigger, paste this Request Body JSON Schema so the app's fields are typed:

```json
{
  "type": "object",
  "properties": {
    "labelResponseOptions": { "type": "string" },
    "requestedShipment": { "type": "object" }
  },
  "required": ["requestedShipment"]
}
```

  Verify: the schema saves with no error.
- [ ] Set "Who can trigger the flow?" to "Any user in my tenant". To narrow it further, choose "Specific users in my tenant" and list the techs or a single service principal. Do not leave it on "Anyone".
  Verify: the parameter shows the tenant-restricted option selected (spec decision 4).
- [ ] Save. Copy the HTTP POST URL that is generated.
  Verify: the URL field is populated. Store the URL for Task 5 and the App wiring plan.

---

## Task 4: Build the flow logic (token, then ship, then respond)

Note on names: Power Automate shows action names with spaces but references them with underscores in expressions. Name the actions exactly as below; the expressions already use the underscore form.

- [ ] Add three Azure Key Vault "Get secret" actions named `Get client id`, `Get client secret`, `Get account number`, each selecting its matching secret. On each, open Settings and turn on Secure Inputs and Secure Outputs.
  Verify: each action resolves its secret name, and run history will hide the values.
- [ ] Add an HTTP action named `Get FedEx token`: method POST, URI `https://apis-sandbox.fedex.com/oauth/token`, header `Content-Type: application/x-www-form-urlencoded`, body:

```
grant_type=client_credentials&client_id=@{body('Get_client_id')?['value']}&client_secret=@{body('Get_client_secret')?['value']}
```

  Turn on Secure Inputs and Secure Outputs.
  Verify: a test run returns 200 with an `access_token` field.
- [ ] Add a Compose action named `Account object` with this expression:

```
json(concat('{"value":"', body('Get_account_number')?['value'], '"}'))
```

  Verify: it outputs an object like `{ "value": "YOUR_ACCOUNT" }`.
- [ ] Add an HTTP action named `Create shipment`: method POST, URI `https://apis-sandbox.fedex.com/ship/v1/shipments`, headers `Authorization: Bearer @{body('Get_FedEx_token')?['access_token']}`, `Content-Type: application/json`, `X-locale: en_US`. Set the Body using this expression (switch the Body field to expression, do not type it as plain text):

```
setProperty(triggerBody(), 'accountNumber', outputs('Account_object'))
```

  Verify: in run history the sent body shows `accountNumber.value` set and `requestedShipment` intact, and the response is 200 with `output.transactionShipments`.
- [ ] Add a Parse JSON action named `Parse ship response` on `body('Create_shipment')`. Generate its schema from `sandbox-ship-response.json` (Task 1) using "Generate from sample".
  Verify: the schema generates and shows `output`, `transactionShipments`, `pieceResponses`, `packageDocuments`, and `encodedLabel`.
- [ ] Add a Response action named `Return to app`: Status 200, header `Content-Type: application/json`, Body:

```json
{
  "trackingNumber": "@{first(body('Parse_ship_response')?['output']?['transactionShipments'])?['pieceResponses'][0]?['trackingNumber']}",
  "encodedLabel": "@{first(body('Parse_ship_response')?['output']?['transactionShipments'])?['pieceResponses'][0]?['packageDocuments'][0]?['encodedLabel']}",
  "status": "CREATED",
  "errors": []
}
```

  Verify: these paths match `sandbox-ship-response.json`. If your real response nests tracking or the label differently, change these expressions to match the saved file. The saved file is the source of truth, not this example.
- [ ] Wrap `Get FedEx token`, `Account object`, `Create shipment`, and `Parse ship response` in a Scope named `Try`. Add a second Scope named `Catch` set to run after `Try` "has failed", "is skipped", or "has timed out", containing a Response action: Status 502, Body:

```json
{ "trackingNumber": "", "encodedLabel": "", "status": "ERROR", "errors": "@{body('Create_shipment')}" }
```

  Verify: forcing a failure (for example a wrong secret) returns the ERROR response carrying the FedEx error body, and nothing prints.

---

## Task 5: Test the secured flow end to end

- [ ] Get a Microsoft Entra token for the flow. In Postman, request a token whose resource or audience is `https://service.flow.microsoft.com/`, as a tenant user or the allowed service principal.
  Verify: you receive an `access_token` whose `aud` is `https://service.flow.microsoft.com/` (paste it at jwt.io to check).
- [ ] POST to the flow URL with header `Authorization: Bearer THE_ENTRA_TOKEN` and the app body without `accountNumber` (the `labelResponseOptions` and `requestedShipment` only, that is the runbook payload minus the `accountNumber` line).
  Verify: 200 with `trackingNumber` and `encodedLabel`; decode the label and confirm the 4x6.
- [ ] Repeat the same call with no Authorization header.
  Verify: the call is rejected (401 or 403), proving anonymous callers cannot create labels.

---

## Task 6: Production swap (go-live gate, not now)

- [ ] FedEx production certification. The Ship API requires label validation before production keys are issued. FedEx reviews sample labels, about 1 to 2 weeks.
  Verify: your FedEx project shows the Ship API approved for production.
- [ ] Replace the three Key Vault secrets with the production client id, secret, and account number.
  Verify: secrets updated. The flow needs no edit because it reads from Key Vault.
- [ ] Change the two FedEx hosts in the flow from `apis-sandbox.fedex.com` to `apis.fedex.com` (the token action and the ship action).
  Verify: one real label creates and prints, then stop. Do not open to the team until the App wiring plan is done.

---

## Out of scope (next plan: App wiring)

- "Create + Print" and "Create + Print All" buttons, the `shipClient` module, and the AadHttpClient call from the SPFx web part.
- Zebra Browser Print install and silent printing, with a `.zpl` download fallback.
- Guards: block on `_addressPartial` or `_missingRequired`, the duplicate-tracking guard, per-row batch results, and reprint.

## Open questions (confirm before go-live)

- `pickupType` default `DROPOFF_AT_FEDEX_LOCATION`, correct, or scheduled pickup?
- `shipDatestamp` default today, correct, or next business day?
- Is the sandbox account also the production shipper account, or a different production account and meter?
- Who owns the flow (Daniel or a service account), and which subscription holds the Key Vault?

## Self-review

- **Spec coverage:** trigger secured with Entra OAuth, tenant-restricted (Task 3) maps to spec decision 4; secret in Key Vault, never in app or repo, with Secure Inputs and Outputs (Task 2 and Task 4) maps to the spec Secrets section; token then ship then the `{ trackingNumber, encodedLabel, status, errors }` response (Task 4) maps to spec Component B; the account injected by the flow not the app (Task 4 Account object) maps to Phase 1 plan decision 3; sandbox proven first (Task 1) maps to spec Phasing step 1; production certification flagged (Task 6). App wiring and Browser Print are deferred to the next plan, matching the spec phasing.
- **Placeholders:** none. The upper-case values (client id, secret, account number, flow URL, tokens) are live secrets only Daniel or IT hold and must never be written into the repo.
- **Consistency:** every action name used in an expression (`Get_client_id`, `Get_client_secret`, `Get_account_number`, `Get_FedEx_token`, `Account_object`, `Create_shipment`, `Parse_ship_response`) is created by an earlier step. FedEx hosts stay sandbox until Task 6. The response paths match the runbook's saved-response shape and are explicitly flagged to verify against that file.

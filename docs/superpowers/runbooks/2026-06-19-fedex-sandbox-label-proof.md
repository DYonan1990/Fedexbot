# FedEx sandbox label proof (run off this machine)

Date: 2026-06-19
Owner: Daniel Yonan, Desktop Support (PSC3)
Goal: Prove that one real 4x6 ZPL label comes back from the FedEx sandbox using the exact request the app builds. Save the real response, because the Phase 2 flow's Parse JSON step is built from it.

This is the "done" proof for Phase 1 (the `buildShipRequest` mapping). It needs no app changes and no backend. It is also Task 1 of the Phase 2 flow plan.

## Why this is by hand

This work machine cannot reach FedEx. Run these steps from any machine with internet, using Postman or curl. Nothing here is committed to the repo.

## What you need

- Your FedEx sandbox client id and client secret (FedEx Developer Portal, your Ship API project).
- Your FedEx sandbox account number.
- Postman, or curl.
- Labelary (labelary.com) to preview the ZPL, or a Zebra printer.

## Step 1: Get a sandbox OAuth token

POST `https://apis-sandbox.fedex.com/oauth/token`
Header: `Content-Type: application/x-www-form-urlencoded`
Body (form): `grant_type=client_credentials&client_id=YOUR_SANDBOX_CLIENT_ID&client_secret=YOUR_SANDBOX_CLIENT_SECRET`

Verify: the response is 200 and contains an `access_token`.

## Step 2: Create the shipment

POST `https://apis-sandbox.fedex.com/ship/v1/shipments`
Headers:
- `Authorization: Bearer THE_TOKEN_FROM_STEP_1`
- `Content-Type: application/json`
- `X-locale: en_US`

Body: the JSON below. It is exactly what `buildShipRequest` produces for one outbound laptop, plus the `accountNumber` at the top. Set `accountNumber.value` to your sandbox account number. (The app never sends the account number. You add it here by hand. The Phase 2 flow injects it from Key Vault.)

```json
{
  "accountNumber": { "value": "YOUR_SANDBOX_ACCOUNT_NUMBER" },
  "labelResponseOptions": "LABEL",
  "requestedShipment": {
    "shipper": {
      "contact": { "personName": "Daniel Yonan", "phoneNumber": "3154546000", "companyName": "Aspen Dental" },
      "address": { "streetLines": ["813 W Wayman St", "17TH FLOOR"], "city": "Chicago", "stateOrProvinceCode": "IL", "postalCode": "60607", "countryCode": "US" }
    },
    "recipients": [{
      "contact": { "personName": "April Walsh", "phoneNumber": "5209078985" },
      "address": { "streetLines": ["2511 W Queen Creek Rd.", "Unit 177"], "city": "Chandler", "stateOrProvinceCode": "AZ", "postalCode": "85248", "countryCode": "US" }
    }],
    "shipDatestamp": "2026-06-19",
    "serviceType": "PRIORITY_OVERNIGHT",
    "packagingType": "YOUR_PACKAGING",
    "pickupType": "DROPOFF_AT_FEDEX_LOCATION",
    "blockInsightVisibility": false,
    "shippingChargesPayment": { "paymentType": "SENDER" },
    "labelSpecification": { "labelStockType": "STOCK_4X6", "imageType": "ZPLII", "labelFormatType": "COMMON2D" },
    "requestedPackageLineItems": [{
      "weight": { "units": "LB", "value": 5 },
      "dimensions": { "length": 15, "width": 11, "height": 4, "units": "IN" },
      "customerReferences": [{ "customerReferenceType": "CUSTOMER_REFERENCE", "value": "INC2231755" }]
    }]
  }
}
```

Verify: the response is 200 and contains a tracking number and an `encodedLabel`. Set `shipDatestamp` to a current date if FedEx rejects a past date.

## Step 3: Save the full response

Save the entire JSON response to a file named `sandbox-ship-response.json`. You paste this into the Phase 2 flow to generate the Parse JSON schema, so keep it.

Verify: the file contains `output.transactionShipments[0].pieceResponses[0].trackingNumber` and `output.transactionShipments[0].pieceResponses[0].packageDocuments[0].encodedLabel`. If FedEx nests these differently, note the real paths. The saved file is the source of truth for the flow.

## Step 4: Decode and view the label

The `encodedLabel` value is base64 ZPL. Decode it to a file:

- macOS or Linux: `echo "PASTE_ENCODEDLABEL" | base64 -d > label.zpl`
- Windows PowerShell: `[IO.File]::WriteAllBytes("label.zpl",[Convert]::FromBase64String("PASTE_ENCODEDLABEL"))`

Preview or print:
- Paste the decoded ZPL into labelary.com set to 4x6 at 203 dpi, or
- Send to a Zebra: on Windows, `copy /b label.zpl \\SERVER\PRINTER`.

Verify: a 4x6 label renders with recipient April Walsh, the Aspen return address, weight 5 LB, and reference INC2231755.

## Step 5: Record the result

Add to CLAUDE.md: the tracking number, the sandbox account used, and today's date. Phase 1 is proven when one real sandbox label has printed.

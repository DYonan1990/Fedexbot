'use strict';

// ============================================================================
// ship-request.test.js
// ----------------------------------------------------------------------------
// Golden tests for buildShipRequest(row, opts): a queue row (the same object
// buildCsv serializes) -> a FedEx Ship API request body (minus the account
// number, which the backend flow injects from Key Vault). Pure function: no
// network, no DOM. The function is pulled out of app/fedex_bot.html by
// load-parser.js, so there is no second copy of the logic.
//
// Note: the function runs inside load-parser's vm sandbox, so the objects it
// returns carry that realm's prototypes. assert.deepStrictEqual compares
// prototypes by reference and would reject cross-realm objects even when every
// value matches. We therefore compare the JSON-normalized form (jsonify) — which
// is also the exact shape that gets POSTed to FedEx, so it is the right contract.
//
// Run: node tests/ship-request.test.js
// ============================================================================

const assert = require('assert');
const { queueHelpers } = require('./load-parser');
const buildShipRequest = queueHelpers.buildShipRequest;

// bring vm-realm output into this realm + match the on-the-wire JSON form
const jsonify = (v) => JSON.parse(JSON.stringify(v));

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
  jsonify(buildShipRequest(outboundRow, { shipDate: '2026-06-19' })),
  expectedOutbound
);
ok('outbound row maps to the FedEx Ship request (LBS->LB, line2 kept, no recipient company, no account number)');

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

const returnReq = jsonify(buildShipRequest(returnRow, { shipDate: '2026-06-19' }));

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

// ---- 3. Multi-package expansion: BASE-2 keeps its suffix ---------------------
const secondPackageRow = Object.assign({}, outboundRow, {
  reference: 'RITM1049891-2',
  _itemLabel: 'iPad',
  packageWeight: 2,
  length: 12, width: 9, height: 2
});

const req3 = jsonify(buildShipRequest(secondPackageRow, { shipDate: '2026-06-19' }));
const pkg3 = req3.requestedShipment.requestedPackageLineItems[0];

assert.strictEqual(pkg3.customerReferences[0].value, 'RITM1049891-2',
  'multi-package reference suffix must be preserved verbatim');
assert.deepStrictEqual(pkg3.weight, { units: 'LB', value: 2 });
assert.deepStrictEqual(pkg3.dimensions, { length: 12, width: 9, height: 2, units: 'IN' });
ok('multi-package row keeps its -2 reference and its own weight/dimensions');

// ---- 4. Decimal dimensions must round to >= 1 inch, never truncate to 0 -----
// A tech typing a custom item dimension of 0.7 in must not ship a 0-inch
// package (parseInt('0.7') === 0). Audit 2026-07-06 finding #2.
const decimalRow = Object.assign({}, outboundRow, {
  reference: 'DECIMAL-TEST',
  packageWeight: 0.4,
  length: '0.7', width: '12', height: '0.9'
});
const req4 = jsonify(buildShipRequest(decimalRow, { shipDate: '2026-06-19' }));
const pkg4 = req4.requestedShipment.requestedPackageLineItems[0];
assert.deepStrictEqual(pkg4.dimensions, { length: 1, width: 12, height: 1, units: 'IN' },
  'decimal dimensions must round to a minimum of 1 inch, not truncate to 0');
ok('decimal dimensions round to >= 1 inch (no 0-inch packages)');

assert.strictEqual(checks, 4, 'expected exactly 4 checks to run');
console.log('\n' + checks + '/4 ship-request checks passed.');

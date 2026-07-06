'use strict';

// ============================================================================
// load-parser.js
// ----------------------------------------------------------------------------
// Pulls parseTicket() (and normalizePhone) STRAIGHT OUT of app/fedex_bot.html.
// Also surfaces the pure queue-durability helpers when present. The app is the
// single source of truth; every run re-extracts from the HTML.
//
//   If you ever rename those two boundary markers in the HTML, update
//   START_MARKER / END_MARKER below to match.
// ============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'app', 'fedex_bot.html');

const START_MARKER = 'const STORAGE_KEY';                       // first real declaration
const END_MARKER = 'const $ = id => document.getElementById';   // first DOM-dependent line

function loadParser() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(
      'load-parser: could not locate the parser block in app/fedex_bot.html.\n' +
      `Looked for START "${START_MARKER}" and END "${END_MARKER}".\n` +
      'If the HTML was refactored, update the markers in tests/load-parser.js.'
    );
  }

  const code = html.slice(startIdx, endIdx);

  const noop = () => {};
  const storageStub = { getItem: () => null, setItem: noop, removeItem: noop };
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: storageStub,
    document: {
      getElementById: () => null,
      createElement: () => ({ classList: { add: noop, remove: noop }, appendChild: noop }),
      body: { appendChild: noop, removeChild: noop },
    },
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  // typeof guards keep this from throwing during the RED phase (before the
  // helpers exist), so the parser suite is never coupled to the persistence one.
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

  if (typeof sandbox.parseTicket !== 'function') {
    throw new Error('load-parser: parseTicket was not found after extraction.');
  }

  return {
    parseTicket: sandbox.parseTicket,
    normalizePhone: sandbox.normalizePhone,
    queueHelpers: sandbox.queueHelpers || {},
  };
}

module.exports = loadParser();

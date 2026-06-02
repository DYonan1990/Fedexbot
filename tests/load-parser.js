'use strict';

// ============================================================================
// load-parser.js
// ----------------------------------------------------------------------------
// Pulls parseTicket() (and normalizePhone) STRAIGHT OUT of app/fedex_bot.html.
//
// Why it works this way:
//   The app is the single source of truth. There is no second copy of the
//   parsing logic to keep in sync. Every test run re-extracts the parser from
//   the HTML, so the tests always test the real, shipping app.
//
// How:
//   The real <script> block defines pure constants + parsing functions FIRST,
//   and only later (from `const $ = id => document.getElementById...`) starts
//   touching the browser DOM. We slice out just the first part and run it in a
//   sandbox with lightweight browser stubs, then hand back parseTicket.
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

  // Minimal browser stubs. The sliced code only DEFINES functions at load time
  // (plus a couple of pure object-building loops), so these are never really
  // exercised — they just keep load-time references from throwing.
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
  vm.runInContext(
    code + '\n;this.parseTicket = parseTicket;\n;this.normalizePhone = normalizePhone;\n',
    sandbox,
    { filename: 'fedex_bot.parser.js' }
  );

  if (typeof sandbox.parseTicket !== 'function') {
    throw new Error('load-parser: parseTicket was not found after extraction.');
  }

  return { parseTicket: sandbox.parseTicket, normalizePhone: sandbox.normalizePhone };
}

module.exports = loadParser();

'use strict';

// ============================================================================
// run-regression.js
// ----------------------------------------------------------------------------
// Runs every ticket in tickets/*.json through the REAL parseTicket() and
// checks the parse against that ticket's `expected` block.
//
// The dataset is the contract:
//   - Only the fields you put in `expected` are checked; anything you omit is
//     ignored. Start small and pin more over time.
//   - `items` is compared as a SET (order doesn't matter).
//   - A run exits 0 only if every checked field of every ticket matches; any
//     mismatch exits 1 (so this drops straight into a pre-commit hook or CI).
//
// Usage:
//   node tests/run-regression.js                       # all datasets
//   node tests/run-regression.js --verbose             # also list passes
//   node tests/run-regression.js --id INC2231755       # one ticket
//   node tests/run-regression.js tickets/my-batch.json # one dataset file
// ============================================================================

const fs = require('fs');
const path = require('path');
const { parseTicket } = require('./load-parser');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const idArg = (() => {
  const i = args.indexOf('--id');
  return i !== -1 ? args[i + 1] : null;
})();
const fileArgs = args.filter((a) => a.endsWith('.json'));

const TICKETS_DIR = path.join(__dirname, '..', 'tickets');

const datasetFiles = fileArgs.length
  ? fileArgs.map((f) => (path.isAbsolute(f) ? f : path.join(process.cwd(), f)))
  : fs
      .readdirSync(TICKETS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(TICKETS_DIR, f));

// ---- comparison helpers ----------------------------------------------------
const canon = (v) => JSON.stringify(v);

function itemsEqual(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) {
    return canon(expected) === canon(actual);
  }
  const norm = (arr) => arr.map(canon).sort();
  const a = norm(expected);
  const b = norm(actual);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function fieldEqual(key, expected, actual) {
  if (key === 'items') return itemsEqual(expected, actual);
  return canon(expected) === canon(actual);
}

// ---- run -------------------------------------------------------------------
let total = 0;
let passed = 0;
const gapsByField = {};
const failures = [];

for (const file of datasetFiles) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Could not read/parse ${file}: ${e.message}`);
    process.exit(1);
  }
  const tickets = data.tickets || [];
  for (const t of tickets) {
    if (idArg && t.id !== idArg) continue;
    total++;
    let result;
    try {
      result = parseTicket(t.raw);
    } catch (e) {
      failures.push({ id: t.id, label: t.label, mismatches: [{ key: '(threw)', expected: 'a parse', actual: e.message }] });
      continue;
    }
    const mismatches = [];
    for (const key of Object.keys(t.expected)) {
      if (!fieldEqual(key, t.expected[key], result[key])) {
        mismatches.push({ key, expected: t.expected[key], actual: result[key] });
        gapsByField[key] = (gapsByField[key] || 0) + 1;
      }
    }
    if (mismatches.length === 0) {
      passed++;
      if (verbose) console.log(`  PASS  ${t.id} — ${t.label || ''}`);
    } else {
      failures.push({ id: t.id, label: t.label, mismatches });
    }
  }
}

// ---- report ----------------------------------------------------------------
if (failures.length) {
  console.log('');
  for (const f of failures) {
    console.log(`FAIL  ${f.id} — ${f.label || ''}`);
    for (const m of f.mismatches) {
      console.log(`        ${m.key}: expected ${canon(m.expected)}  got ${canon(m.actual)}`);
    }
  }
}

console.log('');
console.log(`${passed}/${total} tickets passed.`);

if (Object.keys(gapsByField).length) {
  console.log('\nGaps by field (fix these in app/fedex_bot.html):');
  for (const [k, n] of Object.entries(gapsByField).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k}: ${n}`);
  }
}

process.exit(passed === total ? 0 : 1);

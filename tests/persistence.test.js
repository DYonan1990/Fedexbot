'use strict';

// ============================================================================
// persistence.test.js — unit tests for the queue durability helpers, extracted
// from app/fedex_bot.html via load-parser.js (same single-source reuse as the
// parser). Covers the "only the last entry survives a reload" clobber bug and
// the Save/Load batch (.json) feature. Browser glue is verified separately.
//   Run: node tests/persistence.test.js
// ============================================================================

const { queueHelpers } = require('./load-parser');
const { mergeForPersist, dedupeQueueByReference, serializeBatch, parseBatchFile } = queueHelpers || {};

let passed = 0, failed = 0;
const results = [];
function check(name, fn) {
  try { fn(); passed++; results.push('  PASS  ' + name); }
  catch (e) { failed++; results.push('  FAIL  ' + name + '\n         ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || '') + ' expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
const refs = (q) => q.map((r) => r.reference);

check('mergeForPersist keeps every row when a stale tab adds to a fuller queue', () => {
  assert(typeof mergeForPersist === 'function', 'mergeForPersist is not implemented');
  const persisted = [{ reference: 'A-1' }, { reference: 'A-2' }, { reference: 'A-3' }];
  const staleTabAdds = [{ reference: 'B-1' }];
  const out = mergeForPersist(persisted, staleTabAdds);
  eq(out.length, 4, 'row count:');
  ['A-1', 'A-2', 'A-3', 'B-1'].forEach((r) => assert(refs(out).includes(r), 'missing ' + r));
});

check('mergeForPersist dedupes rows that share a reference', () => {
  assert(typeof mergeForPersist === 'function', 'mergeForPersist is not implemented');
  const out = mergeForPersist([{ reference: 'A-1' }, { reference: 'A-2' }], [{ reference: 'A-2' }, { reference: 'B-1' }]);
  eq(out.length, 3, 'row count:');
  eq(refs(out).filter((r) => r === 'A-2').length, 1, 'A-2 appears exactly once:');
});

check('mergeForPersist keeps reference-less rows distinct', () => {
  assert(typeof mergeForPersist === 'function', 'mergeForPersist is not implemented');
  const out = mergeForPersist([], [{ reference: '' }, { reference: '' }]);
  eq(out.length, 2, 'blank-reference rows must not be collapsed:');
});

check('dedupeQueueByReference keeps the first occurrence of each reference', () => {
  assert(typeof dedupeQueueByReference === 'function', 'dedupeQueueByReference is not implemented');
  const out = dedupeQueueByReference([{ reference: 'X', n: 1 }, { reference: 'X', n: 2 }, { reference: 'Y', n: 3 }]);
  eq(out.length, 2, 'row count:');
  eq(out.find((r) => r.reference === 'X').n, 1, 'first X kept:');
});

check('parseBatchFile round-trips a serialized batch', () => {
  assert(typeof serializeBatch === 'function', 'serializeBatch is not implemented');
  assert(typeof parseBatchFile === 'function', 'parseBatchFile is not implemented');
  const q = [{ reference: 'A-1', recipientCity: 'Chicago' }, { reference: 'A-1-RTN', recipientCity: 'Glendale' }];
  const restored = parseBatchFile(serializeBatch(q));
  eq(JSON.stringify(restored.queue), JSON.stringify(q), 'queue round-trips:');
});

check('parseBatchFile throws on non-JSON', () => {
  assert(typeof parseBatchFile === 'function', 'parseBatchFile is not implemented');
  let threw = false;
  try { parseBatchFile('this is not json at all'); } catch (e) { threw = true; }
  assert(threw, 'expected parseBatchFile to throw on garbage input');
});

check('parseBatchFile throws on JSON with no queue array', () => {
  assert(typeof parseBatchFile === 'function', 'parseBatchFile is not implemented');
  let threw = false;
  try { parseBatchFile('{"kind":"something-else"}'); } catch (e) { threw = true; }
  assert(threw, 'expected parseBatchFile to throw when no queue array is present');
});

check('parseBatchFile accepts a bare array of rows', () => {
  assert(typeof parseBatchFile === 'function', 'parseBatchFile is not implemented');
  const restored = parseBatchFile('[{"reference":"A-1"},{"reference":"A-2"}]');
  eq(restored.queue.length, 2, 'bare array accepted:');
});

console.log(results.join('\n'));
const total = passed + failed;
console.log('\n' + passed + '/' + total + ' persistence checks passed.');
process.exit(failed === 0 ? 0 : 1);

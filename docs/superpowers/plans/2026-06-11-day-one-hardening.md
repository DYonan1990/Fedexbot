# Day-One Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `app/fedex_bot.html` safe for 11 first-day users on SharePoint: zero external requests, visible verify-flags on uncertain fields, and a one-click bad-parse report.

**Architecture:** All changes live in the single client-side HTML file (hard invariant 1). UI work first (Tasks 1–2), CSS bake last (Task 3) so the generated stylesheet covers every class present in the final markup. The parser is never touched; `npm test` (34 pinned tickets) is the regression gate after every task. There is no DOM test harness and adding one is forbidden (no new dependencies) — UI acceptance is verified by scripted greps plus a live browser check in Task 5.

**Tech Stack:** Plain HTML/CSS/JS in one file. Tailwind CSS 3.4 CLI used ONCE, outside the repo, to generate static CSS. Node 22 for splice scripts. Git commits happen via Daniel's GitHub Desktop push (established flow) — this plan's "commit" steps mean "verify green, then sync to the clone for Daniel to push" (Task 5).

**Spec:** `docs/superpowers/specs/2026-06-11-day-one-hardening-design.md`

**Working folder (this machine):** `/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot` in bash, the mounted "Fedex bot" folder in file tools. Final sync target: `C:\Users\A608629\GitHub\Fedexbot` via Explorer + GitHub Desktop.

---

### Task 0: Baseline green

**Files:** none modified.

- [ ] **Step 0.1: Confirm the suite is green before touching anything**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?"`
Expected: `34/34 tickets passed.` and `exit: 0`. If not, STOP — fix state before this plan.

---

### Task 1: Verify flags on parsed fields

**Files:**
- Modify: `app/fedex_bot.html` (3 places: `<style>` block ~line 24–60; recipient form markup near `id="validationBox"` line ~323; JS near `applyParseToForm` line ~2114 and the parse handler near `currentParse = r;` line ~2026)

**Background for the engineer:** after a successful parse, `currentParse` holds the result `r`. `r.confidence` maps field names to `'high' | 'medium' | 'low'` (address fields share `r.confidence.address`). Defaults set `r._phoneDefaulted` / `r._companyDefaulted`. Form inputs: `recipName, recipPhone, recipLine1, recipLine2, recipCity, recipState, recipZip`. Company has NO form input — it appears only in the summary line.

- [ ] **Step 1.1: Add plain-CSS styles (NOT Tailwind utilities — models the new rule)**

In the existing `<style>` block (after the `.mono` rule, line ~33), add:

```css
.verify-flag{ border-color:#d97706 !important; background:#fffbeb; }
.verify-chip{ display:inline-block; margin-left:6px; padding:0 6px; border-radius:9999px;
  background:#fef3c7; color:#92400e; font-size:10px; font-weight:600; vertical-align:middle; }
#verifySummary{ display:none; margin-top:8px; padding:8px 12px; border:1px solid #fcd34d;
  border-radius:6px; background:#fffbeb; color:#92400e; font-size:12px; }
```

- [ ] **Step 1.2: Add the summary line container to the markup**

Directly ABOVE the `<div id="validationBox" ...>` line (~323), insert:

```html
<div id="verifySummary"></div>
```

- [ ] **Step 1.3: Add the flag logic in JS**

Immediately AFTER the closing brace of `function applyParseToForm(r) { ... }`, insert:

```js
// ===== VERIFY-FLAGS (day-one hardening spec, Change 2) =====================
// Surfaces the parser's existing per-field confidence on the form. Display
// only — parsing behavior is untouched. A tech editing a flagged field
// clears that flag (touched = human-verified).
const VERIFY_FIELD_MAP = [
  { id: 'recipName',  label: 'Name',    conf: r => r.confidence.callerName },
  { id: 'recipPhone', label: 'Phone',   conf: r => r.confidence.callerPhone,
    defaulted: r => r._phoneDefaulted },
  { id: 'recipLine1', label: 'Street',  conf: r => r.confidence.address },
  { id: 'recipLine2', label: 'Line 2',  conf: r => r.confidence.address, skipIfEmpty: true },
  { id: 'recipCity',  label: 'City',    conf: r => r.confidence.address },
  { id: 'recipState', label: 'State',   conf: r => r.confidence.address },
  { id: 'recipZip',   label: 'ZIP',     conf: r => r.confidence.address }
];
let verifyFlags = [];   // [{id, label, reason}]

function renderVerifyFlags(r) {
  clearVerifyFlags();
  if (!r) return;
  for (const f of VERIFY_FIELD_MAP) {
    const el = $(f.id);
    if (!el) continue;
    if (f.skipIfEmpty && !el.value.trim()) continue;
    const isDefaulted = f.defaulted ? !!f.defaulted(r) : false;
    const c = f.conf(r);
    if (isDefaulted || c === 'low' || c === 'medium') {
      el.classList.add('verify-flag');
      const chip = document.createElement('span');
      chip.className = 'verify-chip';
      chip.dataset.flagFor = f.id;
      chip.textContent = isDefaulted ? 'defaulted — confirm' : 'verify';
      const lab = el.closest('div')?.querySelector('label');
      if (lab) lab.appendChild(chip);
      verifyFlags.push({ id: f.id, label: f.label });
      el.addEventListener('input', () => clearOneVerifyFlag(f.id), { once: true });
    }
  }
  if (r._companyDefaulted) {
    verifyFlags.push({ id: null, label: 'Company (defaulted to TAG — see parser panel)' });
  }
  renderVerifySummary();
}

function clearOneVerifyFlag(id) {
  $(id)?.classList.remove('verify-flag');
  document.querySelector(`.verify-chip[data-flag-for="${id}"]`)?.remove();
  verifyFlags = verifyFlags.filter(f => f.id !== id);
  renderVerifySummary();
}

function clearVerifyFlags() {
  verifyFlags = [];
  document.querySelectorAll('.verify-flag').forEach(el => el.classList.remove('verify-flag'));
  document.querySelectorAll('.verify-chip').forEach(el => el.remove());
  renderVerifySummary();
}

function renderVerifySummary() {
  const box = $('verifySummary');
  if (!box) return;
  if (verifyFlags.length === 0) { box.style.display = 'none'; box.textContent = ''; return; }
  box.style.display = 'block';
  box.textContent = 'Check before adding: ' + verifyFlags.map(f => f.label).join(', ');
}
// ===== END VERIFY-FLAGS ====================================================
```

- [ ] **Step 1.4: Call it from the parse handler**

Find `currentParse = r;` (line ~2026, inside the parse flow). Immediately after the call that applies the parse to the form (the `applyParseToForm(r)` call in that handler), add:

```js
  renderVerifyFlags(r);
```

Also find the reset path(s) where `currentParse = null;` runs (lines ~2018 and ~2363) and add after each:

```js
  clearVerifyFlags();
```

- [ ] **Step 1.5: Gate**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?"`
Expected: `34/34 tickets passed.` exit 0. (Parser untouched; this proves the file still parses and the extraction markers survived.)

- [ ] **Step 1.6: Static acceptance checks**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && grep -c "renderVerifyFlags\|verifySummary\|verify-chip" app/fedex_bot.html`
Expected: a count ≥ 8 (declaration + call sites + CSS + markup all present).

---

### Task 2: Bad-parse report button

**Files:**
- Modify: `app/fedex_bot.html` (2 places: parse-button markup near `id="parseBtn"` line ~175; JS after the verify-flags block from Task 1)

- [ ] **Step 2.1: Add the button to the markup**

Find the `Parse Ticket` button (`id="parseBtn"`). Directly BEFORE it, in the same flex row, insert:

```html
<button id="reportParseBtn" type="button"
  class="text-xs text-slate-500 underline decoration-dotted hover:text-slate-800 mr-3">
  Report bad parse
</button>
```

- [ ] **Step 2.2: Add the report logic in JS**

Immediately after the `// ===== END VERIFY-FLAGS` line from Task 1, insert:

```js
// ===== BAD-PARSE REPORT (day-one hardening spec, Change 3) =================
// Copies a ready-to-paste block (raw ticket + parsed fields) so any tech can
// report a miss to Daniel in Teams. Nothing is transmitted or stored.
const REPORT_FIELDS = ['ticketNumber','callerName','callerPhone','callerEmail','company',
  'line1','line2','city','state','zip','items','shippingGate'];

function buildParseReport() {
  const raw = $('ticketText').value;
  const r = currentParse;
  const lines = [];
  lines.push('=== QuickShip bad-parse report ===');
  lines.push('App: QuickShip v0.3  ·  ' + new Date().toISOString());
  lines.push('');
  lines.push('--- RAW TICKET (exactly as pasted) ---');
  lines.push(raw);
  lines.push('');
  lines.push('--- WHAT THE PARSER FILLED IN ---');
  if (!r) {
    lines.push('(no successful parse — parser returned nothing for the text above)');
  } else {
    for (const k of REPORT_FIELDS) {
      lines.push(k + ': ' + JSON.stringify(r[k] ?? null));
    }
    for (const k of Object.keys(r).filter(k => k.startsWith('_'))) {
      lines.push(k + ': ' + JSON.stringify(r[k]));
    }
  }
  lines.push('');
  lines.push('--- WHAT IT SHOULD HAVE BEEN (tech: fill this in) ---');
  lines.push('');
  return lines.join('\n');
}

async function reportBadParse() {
  if (!$('ticketText').value.trim()) {
    $('parseStatus').textContent = 'Paste and parse a ticket first, then report.';
    return;
  }
  const text = buildParseReport();
  try {
    await navigator.clipboard.writeText(text);
    $('parseStatus').textContent = 'Copied — paste it to Daniel in Teams.';
  } catch (e) {
    // Clipboard blocked (older browser / permissions): selectable fallback.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'width:100%;height:140px;margin-top:8px;font-size:11px;';
    $('parseStatus').textContent = 'Copy the report below and paste it to Daniel in Teams:';
    $('parseStatus').appendChild(document.createElement('br'));
    $('parseStatus').appendChild(ta);
    ta.select();
  }
}
$('reportParseBtn').addEventListener('click', reportBadParse);
// ===== END BAD-PARSE REPORT ================================================
```

NOTE: the `$('reportParseBtn').addEventListener` line runs at script load. The app's main `<script>` sits at the end of `<body>`, after the markup, so the element exists. Confirm placement is inside that same script block.

- [ ] **Step 2.3: Gate**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?"`
Expected: `34/34 tickets passed.` exit 0.

- [ ] **Step 2.4: Static acceptance checks**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && grep -c "reportParseBtn\|buildParseReport" app/fedex_bot.html`
Expected: count ≥ 4.

---

### Task 3: Self-contained file (CSS bake + font swap) — LAST so it covers Tasks 1–2 markup

**Files:**
- Modify: `app/fedex_bot.html` (head lines 8–11; font rules lines ~25/33/34)
- Scratch (outside repo, never committed): `/tmp/twbake/`

- [ ] **Step 3.1: Generate the static CSS with Tailwind CLI (one-time, outside the repo)**

Run:
```bash
mkdir -p /tmp/twbake && cd /tmp/twbake && npm init -y >/dev/null 2>&1 && npm install tailwindcss@3.4.17 --silent
npx tailwindcss --content "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot/app/fedex_bot.html" -o /tmp/twbake/baked.css --minify
wc -c /tmp/twbake/baked.css
```
Expected: baked.css exists, roughly 20–90 KB. It includes Tailwind's preflight (base resets) plus every utility class found in the file — template-literal classes included, since they are static words in the same file.

- [ ] **Step 3.2: Splice the CSS in, remove the four external lines**

Run this node script (it edits the HTML in place and is idempotent-checked):

```bash
node << 'EOF'
const fs = require('fs');
const f = '/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot/app/fedex_bot.html';
let html = fs.readFileSync(f, 'utf8');
const css = fs.readFileSync('/tmp/twbake/baked.css', 'utf8');
if (html.includes('id="tw-baked"')) throw new Error('already baked');
if (!html.includes('<script src="https://cdn.tailwindcss.com">')) throw new Error('cdn tag not found');
html = html.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/,
  '<style id="tw-baked">\n' + css + '\n</style>');
html = html.replace(/^<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n/m, '');
html = html.replace(/^<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\r?\n/m, '');
html = html.replace(/^<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">\r?\n/m, '');
fs.writeFileSync(f, html);
console.log('spliced. remaining external resource tags:',
  (html.match(/(src|href)="https:\/\//g) || []).length);
EOF
```
Expected output: `spliced. remaining external resource tags: 0`

- [ ] **Step 3.3: Swap fonts to the system stack (3 exact edits)**

Edit 1 — line ~25, old: `font-family:'Inter', system-ui, sans-serif; color:var(--ink);`
new: `font-family:system-ui, 'Segoe UI', sans-serif; color:var(--ink);`

Edit 2 — line ~33, old: `.mono{ font-family:'JetBrains Mono', monospace; letter-spacing:0; }`
new: `.mono{ font-family:ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing:0; }`

Edit 3 — line ~34, old: `h1, h2, h3, h4, .step{ font-family:'Sora', 'Inter', system-ui, sans-serif; letter-spacing:-0.02em; }`
new: `h1, h2, h3, h4, .step{ font-family:system-ui, 'Segoe UI', sans-serif; letter-spacing:-0.02em; }`

- [ ] **Step 3.4: Gate + extraction-marker proof**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?" && grep -c "const STORAGE_KEY" app/fedex_bot.html`
Expected: `34/34 tickets passed.` exit 0, and the marker count is `1` (the baked CSS must not contain that string; if count ≠ 1, the bake corrupted the marker — revert and investigate).

- [ ] **Step 3.5: Self-containment acceptance**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && grep -c '\(src\|href\)="https://' app/fedex_bot.html; grep -c "tw-baked" app/fedex_bot.html`
Expected: `0` then `1`.

- [ ] **Step 3.6: SPFx embed round-trip still byte-identical**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && node spfx/tools/embed-app.js 2>&1 | tail -2`
Expected: completes without error (regenerates the gitignored embed module from the new app file).

---

### Task 4: Documentation updates

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 4.1: Add the plain-CSS rule and session entry to CLAUDE.md**

Add to CLAUDE.md (top "What changed" area + a new rule line):

```markdown
## What changed this session (day-one hardening)
- Implemented docs/superpowers/specs/2026-06-11-day-one-hardening-design.md:
  self-contained file (Tailwind baked into <style id="tw-baked">, Google Fonts
  removed, system font stack, zero external requests), verify-flags on
  low/medium-confidence + defaulted fields with a "Check before adding" summary,
  and a "Report bad parse" clipboard button. Parser untouched; 34/34 before and after.
- NEW RULE — styling: Tailwind is no longer generated at runtime. New UI styles
  must be plain CSS in the existing <style> block (or reuse already-baked
  utilities). New Tailwind class names will NOT style themselves. If a future
  change truly needs new utilities, regenerate via Tailwind CLI 3.4 outside the
  repo and re-splice <style id="tw-baked"> (see the plan doc).
- Parked ideas (Daniel-approved backlog, in order): week-one dataset drive
  (each tech reports one weird ticket), ZIP↔state sanity check, duplicate-
  shipment warning (per-browser only), return-flow walkthrough → own spec,
  printable one-page quick card from docs/team-guide.md.
```

- [ ] **Step 4.2: Gate**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?"`
Expected: `34/34 tickets passed.` exit 0.

---

### Task 5: Sync, push, live verification (replaces git-commit steps; Daniel's Desktop flow)

**Files:** none in repo; Explorer + GitHub Desktop + Chrome actions.

- [ ] **Step 5.1: Sync changed files to the clone**

Via Explorer (computer-use, established two-window copy flow): copy from the OneDrive `Fedex bot` folder into `C:\Users\A608629\GitHub\Fedexbot`, replacing on conflict: `app\fedex_bot.html`, `CLAUDE.md`, `docs\superpowers\specs\2026-06-11-day-one-hardening-design.md`, `docs\superpowers\plans\2026-06-11-day-one-hardening.md`. (Do NOT copy `spfx/generated` output; it is gitignored anyway.)

- [ ] **Step 5.2: Verify the diff in GitHub Desktop**

Expected in Changes tab: `app/fedex_bot.html` (modified), `CLAUDE.md` (modified), 2 new docs files. Anything else → STOP and reconcile.

- [ ] **Step 5.3: Commit and push (Daniel's approval already given for this flow)**

Summary: `Day-one hardening: self-contained file, verify flags, bad-parse report (34/34)`
Then Push origin.

- [ ] **Step 5.4: CI + Pages verification**

Via Chrome: `https://github.com/DYonan1990/Fedexbot/actions` → newest `regression` run green. Then open `https://dyonan1990.github.io/Fedexbot/app/fedex_bot.html` (hard refresh).

- [ ] **Step 5.5: Live acceptance (spec's three acceptance blocks)**

1. Page renders styled; DevTools-free proof: view-source contains `tw-baked`, no `fonts.googleapis`.
2. Paste `Nicole Johnson\n3501 jamboree rd, suite 4000, Newport Beach, CA 92660` → Parse. Expected: Phone shows amber + "defaulted — confirm"; summary line says `Check before adding:` listing Phone and Company; typing in Phone clears its flag and updates the line.
3. Click `Report bad parse`. Expected: status shows `Copied — paste it to Daniel in Teams.` and the clipboard holds the block (raw text + fields).

- [ ] **Step 5.6: Close out**

Report: `✅ Day-one hardening live — app/fedex_bot.html, CLAUDE.md, spec+plan docs — 34/34.`

# Jumbled-Address Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the parser five real Teams/email shapes — four jumbled one-liners (ZIP floating mid-line, name anywhere) and one conversational email with a comma-led name — ending at 40/40 pinned tickets, pushed live.

**Architecture:** Two additions inside `app/fedex_bot.html` only. (1) Strategy C, a last-resort token reassembly in `parseAddressFromText`, gated to short anchor-less inputs with exactly one ZIP token and a state token — unreachable for all 35 existing tickets. (2) A name-lookback in Strategy A's success path for `Name, 123 Street…` shapes. Both route embedded names through the existing careOf mechanism; a one-line change in `applyAddr` lets these paths set name confidence (`low`/`medium`) so the verify flags light up. Test-first against five new dataset tickets.

**Tech Stack:** Plain JS in the single HTML file. No deps, no build step. `npm test` gates every task; post-write file-integrity checks per CLAUDE.md rule (closing tag count, `</html>` ending, full-script `new Function` parse).

**Spec:** `docs/superpowers/specs/2026-06-11-jumbled-address-intake-design.md`

**Paths:** working folder `/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot` (bash) = mounted "Fedex bot" folder (file tools). Sync target `C:\Users\A608629\GitHub\Fedexbot` via Explorer + GitHub Desktop (commits/pushes happen there, not via git CLI).

---

### Task 0: Baseline green

- [ ] **Step 0.1: Verify 35/35 before touching anything**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?"`
Expected: `35/35 tickets passed.` exit 0. If not, STOP.

---

### Task 1: Add the five dataset tickets (watch them fail)

**Files:**
- Modify: `tickets/sample-tickets.json` (append-only, before the closing `]`)

- [ ] **Step 1.1: Append the five tickets via text surgery (never reformat existing entries)**

Run this script (single quotes in raw text are escaped for the heredoc; the JSON parse check at the end proves validity):

```bash
cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && node << 'EOF'
const fs = require('fs');
const f = 'tickets/sample-tickets.json';
let txt = fs.readFileSync(f, 'utf8');
const entries = `,
    {
      "id": "JUMBLED-ADDR-001",
      "label": "Daniel Yonan — jumbled one-liner: name first, ZIP floating before city/state",
      "format": "teams",
      "covers": [
        "Strategy C reassembly: 'Name 4534 N Greenview 60640 Chicago IL' -> name before street -> careOf; street cut at ZIP; city = word before state; all low confidence"
      ],
      "raw": "Daniel Yonan 4534 N Greenview 60640 Chicago IL",
      "expected": {
        "callerName": "Daniel Yonan",
        "_addressNameRecipient": "Daniel Yonan",
        "_isNewHire": false,
        "callerPhone": "3154546000",
        "_phoneDefaulted": true,
        "callerEmail": null,
        "company": "TAG",
        "line1": "4534 N Greenview",
        "line2": null,
        "city": "Chicago",
        "state": "IL",
        "zip": "60640",
        "items": [],
        "shippingGate": "none"
      }
    },
    {
      "id": "JUMBLED-ADDR-002",
      "label": "Daniel Yonan — jumbled one-liner: name LAST, after the state",
      "format": "teams",
      "covers": [
        "Strategy C reassembly: street + ZIP + city + state + trailing name -> name after state -> careOf"
      ],
      "raw": "4534 N Greenview 60640 Chicago IL Daniel Yonan",
      "expected": {
        "callerName": "Daniel Yonan",
        "_addressNameRecipient": "Daniel Yonan",
        "_isNewHire": false,
        "callerPhone": "3154546000",
        "_phoneDefaulted": true,
        "callerEmail": null,
        "company": "TAG",
        "line1": "4534 N Greenview",
        "line2": null,
        "city": "Chicago",
        "state": "IL",
        "zip": "60640",
        "items": [],
        "shippingGate": "none"
      }
    },
    {
      "id": "JUMBLED-ADDR-003",
      "label": "Daniel Yonan — name on own line, jumbled address line below",
      "format": "teams",
      "covers": [
        "Strategy C parses the jumbled address line; the existing Teams-message name rule (9c) takes the bare first line as callerName (no _addressNameRecipient)"
      ],
      "raw": "Daniel Yonan\\n4534 N Greenview 60640 Chicago IL",
      "expected": {
        "callerName": "Daniel Yonan",
        "_isNewHire": false,
        "callerPhone": "3154546000",
        "_phoneDefaulted": true,
        "callerEmail": null,
        "company": "TAG",
        "line1": "4534 N Greenview",
        "line2": null,
        "city": "Chicago",
        "state": "IL",
        "zip": "60640",
        "items": [],
        "shippingGate": "none"
      }
    },
    {
      "id": "JUMBLED-ADDR-004",
      "label": "daniel yonan — lowercase jumbled one-liner, name BETWEEN zip and city",
      "format": "teams",
      "covers": [
        "Strategy C reassembly with lowercase tokens kept as typed; name found mid-string between ZIP and city"
      ],
      "raw": "4534 n greenview 60640 daniel yonan chicago IL",
      "expected": {
        "callerName": "daniel yonan",
        "_addressNameRecipient": "daniel yonan",
        "_isNewHire": false,
        "callerPhone": "3154546000",
        "_phoneDefaulted": true,
        "callerEmail": null,
        "company": "TAG",
        "line1": "4534 n greenview",
        "line2": null,
        "city": "chicago",
        "state": "IL",
        "zip": "60640",
        "items": [],
        "shippingGate": "none"
      }
    },
    {
      "id": "RETURN-REQ-002",
      "label": "Ray Lane — conversational return email, comma-led name before a canonical address; sign-off name must not win",
      "format": "email",
      "covers": [
        "Strategy A name-lookback: 'Ray Lane, 41506 N Hudson Trail, Anthem, AZ 85086' inside a sentence -> name adjacent to street number -> careOf; 'Thanks Dan.' ignored; no device named -> items []"
      ],
      "raw": "Cool.  Ray Lane, 41506 N Hudson Trail, Anthem, AZ 85086.  IF you provide a return label, after I ensure all is moved I'll ship the old back to you.  Thanks Dan.",
      "expected": {
        "callerName": "Ray Lane",
        "_addressNameRecipient": "Ray Lane",
        "_isNewHire": false,
        "callerPhone": "3154546000",
        "_phoneDefaulted": true,
        "callerEmail": null,
        "company": "TAG",
        "line1": "41506 N Hudson Trail",
        "line2": null,
        "city": "Anthem",
        "state": "AZ",
        "zip": "85086",
        "items": [],
        "shippingGate": "none"
      }
    }`;
const anchor = txt.lastIndexOf('\n    }\n  ]');
if (anchor === -1) throw new Error('anchor not found');
txt = txt.slice(0, anchor + 6) + entries + txt.slice(anchor + 6);
fs.writeFileSync(f, txt);
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
console.log('valid JSON, tickets:', d.tickets.length, '| last:', d.tickets.slice(-5).map(t=>t.id).join(', '));
EOF
```
Expected output: `valid JSON, tickets: 40 | last: JUMBLED-ADDR-001, JUMBLED-ADDR-002, JUMBLED-ADDR-003, JUMBLED-ADDR-004, RETURN-REQ-002`

- [ ] **Step 1.2: Run the suite — confirm exactly the right failures**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -30`
Expected: `35/40 tickets passed.` — JUMBLED-ADDR-001..004 fail on callerName/line1/city/state/zip; RETURN-REQ-002 fails ONLY on callerName and `_addressNameRecipient`. Any other failure → STOP, the baseline shifted.

---

### Task 2: `applyAddr` name-confidence passthrough + Strategy A name-lookback

**Files:**
- Modify: `app/fedex_bot.html` — `applyAddr` (one line) and Strategy A's success block in `parseAddressFromText`

- [ ] **Step 2.1: Let careOf carry its own confidence (backward-compatible default 'high')**

In `applyAddr`, find:
```js
      result.confidence.callerName = 'high';
```
Replace with:
```js
      result.confidence.callerName = parsed._nameConfidence || 'high';
```

- [ ] **Step 2.2: Add the name-lookback to Strategy A**

In `parseAddressFromText`, Strategy A's loop ends with:
```js
    return { line1, line2, city, state: cand.state, zip: cand.zip };
```
Replace that line with:
```js
    // ===== NAME-LOOKBACK (comma-led name before an inline street) =========
    // "Cool.  Ray Lane, 41506 N Hudson Trail, ..." -> the name TOUCHING the
    // street number (comma-separated) is the recipient. Adjacency is the
    // safety: greetings/sign-offs elsewhere can never match. Word pattern
    // excludes periods so "Cool." can't glue onto the name.
    // Pinned by RETURN-REQ-002.
    let careOf;
    const streetPos = before.lastIndexOf(line1);
    if (streetPos > 0) {
      const pre = before.slice(0, streetPos);
      const nm = pre.match(/([A-Z][A-Za-z'’\-]*(?:\s+[A-Z][A-Za-z'’\-]*){1,3}),\s*$/);
      if (nm && nm[1].length <= 40 &&
          !/\b(PO|Box|Suite|Ste|Apt|Unit|Bldg|Building|Floor|Fl|Room|Rm)\b/i.test(nm[1])) {
        careOf = nm[1].trim();
      }
    }
    return { line1, line2, city, state: cand.state, zip: cand.zip,
             careOf, _nameConfidence: careOf ? 'medium' : undefined };
```

- [ ] **Step 2.3: Gate**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -8; echo "exit: $?"`
Expected: `36/40 tickets passed.` — RETURN-REQ-002 now green, the four JUMBLED tickets still red, zero other changes.

---

### Task 3: Strategy C — jumbled short-line reassembly

**Files:**
- Modify: `app/fedex_bot.html` — end of `parseAddressFromText` (before its final `return null;`) and the fallback call site (`applyAddr(parsed, 'medium')`)

- [ ] **Step 3.1: Insert Strategy C before the final `return null;` of `parseAddressFromText`**

The function currently ends:
```js
    return { line1, line2, city, state, zip, facility, careOf: leadingName || undefined };
  }
  return null;
}
```
Replace the trailing `  return null;\n}` of the function with:
```js
  // ===== STRATEGY C — jumbled short-line reassembly ========================
  // (spec: 2026-06-11-jumbled-address-intake-design.md; JUMBLED-ADDR-001..004)
  // Last resort for Teams pastes where the ZIP floats mid-line ("4534 N
  // Greenview 60640 Chicago IL") so no conventional anchor exists. Trigger is
  // strict — short input, NO anchors anywhere, exactly one 5-digit token, a
  // real state token — so the structured/A/B paths and all previously pinned
  // tickets are unreachable from here. Typed case is kept. Every field gets
  // LOW confidence so the verify flags light up.
  if (candidates.length === 0) {
    const snippetLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const zipsAll = [...text.matchAll(/\b(\d{5})\b/g)];
    if (snippetLines.length >= 1 && snippetLines.length <= 3 && zipsAll.length === 1) {
      const zip = zipsAll[0][1];
      const zipLine = snippetLines.find(l => l.includes(zip));
      if (zipLine) {
        const clean = t => t.replace(/[.,]+$/, '');
        const tokens = zipLine.split(/\s+/).map(clean).filter(Boolean);
        const zipIdx = tokens.findIndex(t => t === zip);
        let stateIdx = -1;
        for (let i = tokens.length - 1; i >= 0; i--) {
          if (i === zipIdx) continue;
          if (/^[A-Za-z]{2}$/.test(tokens[i]) && US_STATES.has(tokens[i].toUpperCase())) { stateIdx = i; break; }
        }
        let streetStart = -1;
        for (let i = 0; i < tokens.length; i++) {
          if (i === zipIdx) continue;
          if (/^\d{1,6}[A-Za-z]?$/.test(tokens[i])) { streetStart = i; break; }
        }
        const cityIdx = stateIdx - 1;
        if (zipIdx !== -1 && stateIdx !== -1 && streetStart !== -1 &&
            streetStart < zipIdx && cityIdx > -1 && cityIdx !== zipIdx &&
            /^[A-Za-z]/.test(tokens[cityIdx] || '')) {
          const line1 = tokens.slice(streetStart, zipIdx).join(' ');
          const city = tokens[cityIdx];
          // Name search: (b) before street, (c) after state, (d) between ZIP
          // and city. 2–4 plain words (any case — lowercase pastes happen),
          // no digits, no unit/PO keywords.
          const NAME_OK = w => /^[A-Za-z][A-Za-z'’\-]*$/.test(w);
          const UNIT_KW = /\b(PO|Box|Suite|Ste|Apt|Unit|Bldg|Building|Floor|Fl|Room|Rm)\b/i;
          const tryName = arr => {
            if (arr.length >= 2 && arr.length <= 4 && arr.every(NAME_OK)) {
              const joined = arr.join(' ');
              if (joined.length <= 40 && !UNIT_KW.test(joined)) return joined;
            }
            return null;
          };
          const nameB = tryName(tokens.slice(0, streetStart));
          const nameC = tryName(tokens.slice(stateIdx + 1));
          const nameD = tryName(tokens.slice(zipIdx + 1, cityIdx));
          const careOfC = nameB || nameC || nameD || undefined;
          if (line1 && city) {
            return { line1, line2: '', city, state: tokens[stateIdx].toUpperCase(), zip,
                     careOf: careOfC, _nameConfidence: careOfC ? 'low' : undefined,
                     _strategy: 'C' };
          }
        }
      }
    }
  }
  return null;
}
```

- [ ] **Step 3.2: Lower the applied address confidence for Strategy C results**

At the fallback call site, find:
```js
    const parsed = parseAddressFromText(text);
    if (parsed) {
      applyAddr(parsed, 'medium');
```
Replace with:
```js
    const parsed = parseAddressFromText(text);
    if (parsed) {
      applyAddr(parsed, parsed._strategy === 'C' ? 'low' : 'medium');
```

- [ ] **Step 3.3: Gate — full pass**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -4; echo "exit: $?"`
Expected: `40/40 tickets passed.` exit 0.

- [ ] **Step 3.4: File integrity (CLAUDE.md rule — npm test alone does not prove the page loads)**

Run:
```bash
cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && echo "closing tags: $(grep -c '</script>' app/fedex_bot.html)" && tail -c 10 app/fedex_bot.html && node -e "
const html=require('fs').readFileSync('app/fedex_bot.html','utf8');
const s=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim());
s.forEach((x,i)=>{new Function(x);console.log('block',i,'syntax OK,',x.length,'chars')});"
```
Expected: `closing tags: 1`, file ends `</html>`, `block 0 syntax OK`.

---

### Task 4: Documentation

**Files:**
- Modify: `CLAUDE.md` (named rules + counts + session log), `PROJECT-INSTRUCTIONS.md` (count 35→40)

- [ ] **Step 4.1: CLAUDE.md — update count lines, add session entry and two named rules**

Update "Where things stand" to **40/40** (dataset growth note: → 40 via JUMBLED-ADDR-001..004 + RETURN-REQ-002). Add to named rules:

```markdown
- **Jumbled-address reassembly** (Strategy C, added 2026-06-11, Daniel-confirmed): short
  anchor-less pastes (1–3 lines, exactly one 5-digit token, real state token) are reassembled
  by token position — street = number→ZIP, city = word before state, name (any case, 2–4 words)
  found before the street, after the state, or between ZIP and city → careOf. ALL fields low
  confidence → amber flags. Typed case kept. JUMBLED-ADDR-001..004.
- **Inline name-lookback** (Strategy A, added 2026-06-11, Daniel-confirmed): a comma-led
  person name immediately touching the street number of an inline address ("Ray Lane, 41506…")
  is the recipient via careOf, confidence medium; greetings/sign-offs elsewhere never match.
  RETURN-REQ-002.
```

Session log entry: spec + plan paths, 35/40 → fixes → 40/40, zero edits to existing tickets.

- [ ] **Step 4.2: PROJECT-INSTRUCTIONS.md count**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && sed -i 's/MUST end \`35\/35 tickets passed.\`/MUST end \`40\/40 tickets passed.\`/' PROJECT-INSTRUCTIONS.md && grep -o "40/40 tickets passed" PROJECT-INSTRUCTIONS.md`
Expected: `40/40 tickets passed`

- [ ] **Step 4.3: Gate**

Run: `cd "/sessions/inspiring-vibrant-ramanujan/mnt/Fedex bot" && npm test 2>&1 | tail -2; echo "exit: $?"`
Expected: `40/40 tickets passed.` exit 0.

---

### Task 5: Sync, push, live verification

- [ ] **Step 5.1: Explorer copy (click flow, no typing between Copy and Paste)**

Copy from the OneDrive `Fedex bot` folder into `C:\Users\A608629\GitHub\Fedexbot`, Replace on conflict: `app` folder, `tickets` folder, `docs` folder, `CLAUDE.md`, `PROJECT-INSTRUCTIONS.md`.

- [ ] **Step 5.2: GitHub Desktop — verify the diff**

Expected Changes: `app/fedex_bot.html`, `tickets/sample-tickets.json`, `CLAUDE.md`, `PROJECT-INSTRUCTIONS.md`, `docs/...jumbled-address-intake-design.md` (new), `docs/...jumbled-address-intake.md` (new) = 6 files. Anything else → STOP and reconcile.

- [ ] **Step 5.3: Commit and push**

Summary: `Jumbled-address intake: Strategy C reassembly + inline name-lookback (40/40)`
Verify the summary text landed intact (Home key + zoom), Commit to main, Push origin.

- [ ] **Step 5.4: CI + live click-test**

Actions page: newest `regression` run green. Then on the live Pages app (hard refresh): paste `Daniel Yonan 4534 N Greenview 60640 Chicago IL`, Parse. Expected: name Daniel Yonan, street 4534 N Greenview, Chicago / IL / 60640, phone defaulted, amber verify flags on the filled fields and the "Check before adding" summary listing them. Console: no app errors.

- [ ] **Step 5.5: Close out**

Report: `✅ Jumbled-address intake live — app/fedex_bot.html, tickets/sample-tickets.json, docs — 40/40.`

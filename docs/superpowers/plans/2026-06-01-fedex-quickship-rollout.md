# FedEx QuickShip Rollout Implementation Plan

> **For agentic workers:** This is a deployment/rollout plan executed mostly by a human
> (Daniel) on a Windows machine and through Microsoft 365 / GitHub web UIs, because the
> sandbox can't reach GitHub or your tenant. Steps use checkbox (`- [ ]`) syntax for
> tracking. "Verify" lines are the test for each step — do not move on until the Expected
> result is true.

**Goal:** Get FedEx QuickShip into a private GitHub repo and in front of the Desktop Support team as a click-to-run link, with an interim stopgap so they can start using it immediately.

**Architecture:** Private GitHub repo = source of truth. In-tenant host (Azure Static Web App) = runtime, deployed from the repo. Teams tab = front door. A SharePoint synced copy bridges the gap until the in-tenant host is live.

**Tech Stack:** GitHub (private repo + Actions CI), Node.js (local test gate), Azure Static Web Apps (free tier) OR SharePoint SPFx, Microsoft Teams.

**Inputs you supply during execution** (write them here as you go):
- GitHub username / org: `__________`
- IT/admin contact for hosting request: `__________`
- Final in-tenant app URL (filled in Phase 4): `__________`
- Teams team + channel to host the tab: `__________`

---

## Phase 0 — Pre-flight (on your Windows machine, ~5 min)

### Task 0: Clean state and confirm green

**Files:**
- Delete: `C:\Users\Daniel Yonan\Documents\Claude\Projects\Fedex Quickship Bot\.git` (broken, empty)

- [ ] **Step 1: Delete the broken `.git` folder**

In File Explorer, open the project folder. View → check **Hidden items**. Delete the `.git`
folder. (It has no history — it was a half-created init the sandbox couldn't finish.)

Verify: no `.git` folder remains in the project folder.

- [ ] **Step 2: Confirm the test suite is green**

Install Node.js LTS first if needed (https://nodejs.org). Open a terminal in the project folder:

```
npm test
```

Verify — Expected output ends with: `22/22 tickets passed.` and exit code 0.

- [ ] **Step 3: Decide which folder is canonical**

You want this living at `C:\Users\Daniel Yonan\Documents\GitHub\Fedexbot`. Move/copy the
entire project folder there now, and do all remaining steps in that location.

Verify: `C:\Users\Daniel Yonan\Documents\GitHub\Fedexbot\app\fedex_bot.html` exists and
`npm test` is green from that location.

---

## Phase 1 — Publish to GitHub (private), ~10 min

### Task 1: Create the private repo and push

**Files:** entire repo.

- [ ] **Step 1: Install GitHub Desktop**

Download from https://desktop.github.com and sign in with your GitHub account (create one
free at https://github.com if you don't have it — free accounts get unlimited private repos).

- [ ] **Step 2: Add the local repository**

GitHub Desktop → **File → Add local repository →** choose
`C:\Users\Daniel Yonan\Documents\GitHub\Fedexbot`. When it says "this directory is not a Git
repository," click **"create a repository"**. Leave "Git ignore" as **None** (the repo
already has a `.gitignore`). Click **Create repository**.

Verify: GitHub Desktop shows the files as the first commit's changes.

- [ ] **Step 3: Make the first commit**

In the Summary box type: `Initial commit: FedEx QuickShip repo + regression harness (22/22 green)`.
Click **Commit to main**.

Verify: the Changes list empties; History shows one commit.

- [ ] **Step 4: Publish as PRIVATE**

Click **Publish repository**. In the dialog, **check "Keep this code private."** Set the name
to `Fedexbot` (or your choice). Click **Publish repository**.

Verify: open the repo on github.com — it shows a 🔒 **Private** badge and your files.

- [ ] **Step 5: Confirm CI ran**

On github.com, open the repo's **Actions** tab.

Verify: a workflow run named **regression** appears with a green ✓ (it ran `npm test` on
GitHub's servers). If it's red, open it, read the failing ticket, fix `app/fedex_bot.html`,
commit, and push (GitHub Desktop → Commit → Push origin).

- [ ] **Step 6: (Optional) Invite collaborators**

github.com → repo → **Settings → Collaborators → Add people** for any teammate who will also
edit the parser. (Teammates who only *use* the tool do NOT need repo access — they use the
hosted link from Phase 5.)

Verify: invited collaborators appear under Collaborators.

---

## Phase 2 — Interim stopgap so the team can start tonight, ~10 min

This gives the team access immediately, before IT provisions the real host. It is temporary.

### Task 2: Put a runnable copy in SharePoint

**Files:** `app/fedex_bot.html` (a copy, clearly marked interim).

- [ ] **Step 1: Upload the app to a SharePoint library you own**

In your team's SharePoint site → **Documents** → create a folder `FedEx QuickShip (interim)` →
**Upload** `app/fedex_bot.html`.

Verify: the file appears in the library.

- [ ] **Step 2: Confirm the "open in browser" limitation**

Click the uploaded `fedex_bot.html` in SharePoint.

Verify — Expected: it does **not** run as an app (it downloads or shows raw text). This is the
strict file-handling model and is exactly why we need Phase 4. Confirming it now means no
surprises later.

- [ ] **Step 3: Give the team the working interim method**

Tell the team to **sync** the folder (SharePoint → **Sync** button, opens in OneDrive) and then
open the **local synced copy** in Microsoft Edge (right-click the file → Open with → Edge).
The local file runs fully. Alternatively, for week one, run batches yourself and share the CSV.

Verify: from a synced copy, double-clicking opens the app in Edge and it runs (you can paste a
ticket and it parses).

- [ ] **Step 4: Post the stopgap note to the team channel**

> "Interim access to FedEx QuickShip: Sync the **FedEx QuickShip (interim)** folder and open
> `fedex_bot.html` in Edge. A proper one-click link is coming — I'll swap you over when it's
> ready. Flag any ticket it gets wrong to me."

Verify: message posted; at least one teammate confirms it runs for them.

---

## Phase 3 — Request the in-tenant host from IT, ~5 min to send

### Task 3: Send the hosting request

- [ ] **Step 1: Send IT this exact request** (email or ticket to your IT/admin contact)

> Subject: Hosting request — single-file internal web tool (Azure Static Web App)
>
> I maintain a single-file, client-side HTML tool (no server, no database, no outbound data —
> it runs entirely in the browser) that my Desktop Support team needs to open from a link.
> Please host it for **org-only access**, ideally as an **Azure Static Web App (free tier)**
> connected to my **private GitHub repo** `<github-username>/Fedexbot`, with **work-account
> sign-in required** so only our org can open it, and reachable as a **Teams tab**.
> If Azure Static Web Apps isn't approved, the equivalent is deploying it as an **SPFx web
> part** to our SharePoint app catalog — either works. I can grant repo access. Repo is private.

- [ ] **Step 2: Record their answer**

Write the chosen path and any URL/contact in the **Inputs** block at the top of this plan.

Verify: you have a yes/no and, if yes, a named owner and an ETA.

- [ ] **Step 3: If both are blocked**

Fall back to keeping the Phase 2 stopgap as the ongoing method, and note it. Revisit the
spec's Section 10 fallback (Azure Static Web App via a free personal Azure account, or a
shared network drive launch). Do not proceed to Phase 4/5 until a host exists.

Verify: you have a decision — either a host is coming (go to Phase 4) or the stopgap is the
accepted interim (skip to Phase 6, teach with the stopgap method).

---

## Phase 4 — Stand up the in-tenant host (Azure Static Web App), ~20 min (with IT)

> Do this with whoever has Azure access. If IT chose SPFx instead, follow their app-catalog
> deployment instead and skip to Phase 5 once you have an org-only URL.

### Task 4: Deploy from the repo

- [ ] **Step 1: Create the Static Web App**

In the Azure portal → **Create resource → Static Web App**. Plan type: **Free**. Source:
**GitHub** → authorize → pick org/repo `Fedexbot`, branch `main`. Build presets: **Custom**.
App location: `app`. Api location: *(blank)*. Output location: *(blank)*.

Verify: Azure creates the resource and adds a deploy workflow to the repo (you'll see a new
`.github/workflows/azure-static-web-apps-*.yml` after it pushes).

- [ ] **Step 2: Wait for the first deploy**

Repo → **Actions** → the Azure deploy workflow runs.

Verify — Expected: green ✓, and the Static Web App's **URL** (shown in the Azure resource
overview, like `https://<name>.azurestaticapps.net`) loads `fedex_bot.html` and the app runs.

- [ ] **Step 3: Lock it to your org (work-account sign-in)**

In the Static Web App → **Settings → Authentication** (or via a `staticwebapp.config.json`
that requires authenticated access and restricts to your Entra tenant). Have IT confirm the
Entra/AAD provider is the only one allowed and anonymous access is blocked.

Verify — Expected: opening the URL in a private/incognito window prompts for a work-account
sign-in; a personal/no account is denied.

- [ ] **Step 4: Confirm the index entry point**

Open the bare URL (without `/fedex_bot.html`).

Verify: if it 404s, add a tiny `app/index.html` that redirects to `fedex_bot.html`
(`<meta http-equiv="refresh" content="0; url=fedex_bot.html">`), commit, push, and re-verify
the bare URL loads the app. Record the final URL in the **Inputs** block.

---

## Phase 5 — Front door: Teams tab + SharePoint link, ~10 min

### Task 5: Make it one click for the team

- [ ] **Step 1: Add a Teams "Website" tab**

In the team's channel → **+** (Add a tab) → **Website** → Name: `FedEx QuickShip` → URL: the
final in-tenant URL from Phase 4 → **Save**.

Verify: clicking the tab loads the app inside Teams and it runs.

- [ ] **Step 2: Fallback if the embed is blocked**

If the tab shows a blank/blocked frame (some pages refuse to be iframed), instead add a
**Link** tab or pin the URL in the channel.

Verify: the chosen method opens the running app in one click.

- [ ] **Step 3: Mirror on SharePoint + a desktop shortcut**

On your SharePoint site, add a **Quick link** (or a Link web part) to the same URL. Create a
desktop shortcut to the URL for anyone who prefers the browser.

Verify: both the SharePoint link and the desktop shortcut open the running app.

- [ ] **Step 4: Retire the stopgap**

Delete or clearly mark the Phase 2 `FedEx QuickShip (interim)` folder as **RETIRED — use the
Teams tab**. One canonical copy only.

Verify: the interim folder is gone or unmistakably marked; no one is opening synced copies.

---

## Phase 6 — Teach the team + close the loop, ~10 min

### Task 6: Onboard the team

- [ ] **Step 1: Post the 3-message script** (from the hosting spec, Section 9)

> 1. "Here's the link — open the **FedEx QuickShip** tab in our Teams channel. Nothing to
>    install, always the current version."
> 2. "Paste the ticket (or upload the sheet), check the review screen, click export. Your
>    saved data stays in your browser."
> 3. "If it gets one wrong, send me the ticket — I lock it in as an example and fix the parser
>    so it's never wrong on that case again."

Verify: posted; at least two teammates have opened the tab and run a real ticket.

- [ ] **Step 2: Establish the flag-it loop**

Decide where misses get reported (a Teams channel or a shared note). When one comes in, follow
the learning loop: add the ticket to `tickets/sample-tickets.json` with the correct `expected`,
run `npm test`, fix `app/fedex_bot.html` until green, commit, push (CI + Azure auto-deploy ship
it).

Verify: you've run the loop once end-to-end (add a ticket → red → fix → green → push → live).

- [ ] **Step 3: Make the version visible**

Confirm the app header shows a version + build date and bump it on each release so anyone can
confirm they're current.

Verify: the header on the live URL shows the current version/date.

---

## Self-review notes (coverage against the hosting spec)

- Spec §2/§10 (private repo + in-tenant host) → Phases 1 & 4. ✓
- Spec §6 (canonical intake / single source) → repo already structured; CI in Phase 1. ✓
- Spec §7 (interim stopgap) → Phase 2. ✓
- Spec §6 IT request (exact wording) → Phase 3 Step 1. ✓
- Spec §8 (Teams tab + SharePoint + shortcut, iframe fallback) → Phase 5. ✓
- Spec §9 (teach the team, flag-it loop) → Phase 6. ✓
- Spec §10 "both blocked" fallback → Phase 3 Step 3. ✓

**Dependency note:** Phases 4–5 are blocked on IT's answer in Phase 3. Phases 0–2 deliver a
usable tool tonight with zero external dependencies, so the team is never blocked waiting.

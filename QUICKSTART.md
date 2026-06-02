# QuickStart — finish & ship to your team

This is your repo at `C:\Users\Daniel Yonan\Documents\GitHub\Fedexbot`, already connected to
**github.com/DYonan1990/Fedexbot**. The code is built and **green (29/29 tests pass)**. You do
**not** need a new repo — just commit the files that are now in this folder and push.

## What's in here now

```
app/fedex_bot.html              the app + parser (single source of truth)
tickets/sample-tickets.json     golden dataset — 29 tickets
tests/load-parser.js            pulls parseTicket() out of the HTML
tests/run-regression.js         runs all 29 tickets, fails loud on any miss
package.json                    defines `npm test`
.github/workflows/test.yml      auto-runs the tests on every push
docs/superpowers/...            design spec + rollout plan
README.md                       project overview + the learning loop
QUICKSTART.md                   this file
```

## 1. (Optional) Run the tests locally

Needs Node.js (https://nodejs.org, LTS). In a terminal opened to this folder:

```
npm test
```

Expected: `29/29 tickets passed.`

## 2. Commit & push to the existing repo — GitHub Desktop

1. Open **GitHub Desktop**. If it doesn't already show **Fedexbot**, do
   **File → Add local repository →** select `C:\Users\Daniel Yonan\Documents\GitHub\Fedexbot`.
2. The left panel shows all the new files (app/, tickets/, tests/, …) as changes.
3. Bottom-left **Summary:** `Add FedEx QuickShip app, regression harness, and rollout docs (29/29 green)`.
4. Click **Commit to main**.
5. Click **Push origin** (top bar).
6. If it says the remote has changes, click **Pull**, then **Push** again. (Happens only if the
   GitHub README was edited online.)

Prefer the command line? In this folder:

```
git add -A
git commit -m "Add FedEx QuickShip app, regression harness, and rollout docs (29/29 green)"
git push origin main
```

## 3. Verify it landed

1. Open https://github.com/DYonan1990/Fedexbot — you should see all the folders.
2. Open the **Actions** tab — the **regression** workflow runs `npm test` on GitHub's servers.
   Expected: a green ✓. (If red, open it, read the failing ticket, fix `app/fedex_bot.html`,
   commit, push.)

## 4. Make sure it's PRIVATE

GitHub → repo → **Settings → General → Danger Zone → Change visibility →** confirm **Private**
(so the FedEx templates and sender block stay internal). Invite any teammate who will also
*edit* the parser via **Settings → Collaborators**. Teammates who only *use* the tool don't
need repo access — they get the hosted link (next step).

## 5. Get it in front of the team

Follow `docs/superpowers/plans/2026-06-01-fedex-quickship-rollout.md`:
- **Phase 2** — interim SharePoint synced copy so the team can start now.
- **Phase 3** — the exact request to send IT for the org-only host.
- **Phases 4–5** — stand up the host and add the Teams tab.
- **Phase 6** — the 3-message team onboarding + the flag-it learning loop.

## Note on the two folders

`Documents\GitHub\Fedexbot` (this one) is now the **source of truth** — work here from now on.
The earlier `Documents\Claude\Projects\Fedex Quickship Bot` copy was a scratch workspace; you can
ignore or delete it. (It has a half-created `.git` that never completed — not used here.)

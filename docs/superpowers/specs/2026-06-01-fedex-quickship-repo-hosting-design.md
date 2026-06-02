# FedEx QuickShip — Private Repo & In-Tenant Hosting (Design)

- **Date:** 2026-06-01
- **Status:** Design for review
- **Owner:** Daniel Yonan — Desktop Support (PSC3), Aspen Dental
- **Decision:** Private GitHub repo as the single source of truth; in-tenant hosting (Path B) as the live runtime; SharePoint/Teams as the front door. Public hosting is rejected so the FedEx templates and sender details stay private.

This document is both the design **and** the plain-language walkthrough you can use to set the
repo up and teach the team. Every section says *what* and *why*, so nothing is a black box.

---

## 1. The one-paragraph picture

There are three different jobs, and the mistake most people make is trying to do all three in one
place. The three jobs are: **store** the app (the repo), **run** the app (the host), and **reach**
the app (the front door). We give each job its own home, connected in a straight line:

```
   PRIVATE GitHub repo   ──deploy──▶   In-tenant host (https)   ◀──link/tab──   Teams tab / SharePoint
   (STORE: the truth)                  (RUN: executes the HTML)                 (REACH: what people click)
        │
        └── npm test runs on every change  (the safety gate that keeps the parser correct)
```

Read it left to right: you edit the app in the **repo**, a test gate proves you didn't break
anything, the approved copy is published to the **host**, and your teammates open it from a
**Teams tab**. One copy, one path, no emailed versions.

**Why split it three ways?** Because each job has a different "best tool," and gluing them together
is what makes shared tools rot. The repo is for *history and safety*. The host is for *running it
in a browser*. The front door is for *finding it*. Keep them separate and you can swap any one of
them later without touching the others — for example, move from a stopgap host to the real
in-tenant host, and nobody's link changes.

---

## 2. Why a private repo, and why in-tenant hosting

You chose to keep the FedEx templates and sender block private. That single choice drives two
decisions:

- **The repo is private.** A free GitHub account gives unlimited private repositories. The source
  code — which contains your sender defaults (`Daniel Yonan` / `Aspen Dental` /
  `shippinghelp@aspendental.com` / `3154546000`) and the package templates — is visible only to
  people you invite.
- **The host is in-tenant (Path B), not GitHub Pages.** GitHub Pages would be the easy public host,
  but Pages will not serve from a *private* repo on a free plan, and we don't want it public anyway.
  So the live, click-to-run copy is hosted inside your Microsoft tenant, where only your org can
  reach it. Details and the exact IT request are in Section 6.

**The honest tradeoff:** going private means there is no instant public link on day one. The live
link arrives when IT stands up the in-tenant host. Until then, there's a simple stopgap (Section 7)
so the team isn't blocked.

---

## 3. What we're building vs. what already exists

Right now the folder on disk is **flat** — just three files:

```
fedex_bot.html        the working app + parser
sample-tickets.json   the golden test dataset
README.md             explains the project
```

The README *describes* a fuller structure (`app/`, `tickets/`, `tests/`, `docs/`) and a
`npm test` command, but those folders and the test runner **don't physically exist yet**. So
"build the repo" really means: reshape these three files into the proper structure and add the
missing pieces (the test harness, `package.json`, the automation). That's what the rest of this
document lays out.

---

## 4. Repository structure — folder by folder, and why

This is the layout we'll create. Each line explains the job it does, so you can explain it to anyone.

```
fedex-quickship/
├── app/
│   └── fedex_bot.html          ← THE app. The only place the real logic lives.
├── tickets/
│   └── sample-tickets.json     ← The "golden" examples: messy input + the correct answer.
├── tests/
│   ├── load-parser.js          ← Pulls the parser straight out of fedex_bot.html.
│   └── run-regression.js       ← Runs every golden example and checks the app still gets it right.
├── docs/
│   └── superpowers/specs/      ← Design docs like this one. The "why," written down.
├── package.json                ← Defines the "npm test" command and project metadata.
├── .github/
│   └── workflows/test.yml       ← Robot that re-runs the tests automatically on every change.
└── README.md                   ← Front page: what this is, how to run it, the learning loop.
```

**Why this shape, in plain terms:**

- **`app/` holds exactly one file, and it's the single source of truth.** The golden rule of this
  project is "never make a second copy of the logic." If the parser lived in two files, they would
  drift apart and you'd never know which is right. Everything — the tests, the host, the team —
  points at this one file.
- **`tickets/` is the app's memory.** Every real ticket you add (with its correct answer) becomes a
  permanent example the app must keep satisfying. More examples = a smarter, more trustworthy parser.
  This folder *is* the accumulated knowledge of the tool.
- **`tests/` is the safety net.** `run-regression.js` reads the parser out of `app/fedex_bot.html`
  and replays every example in `tickets/`. If a change breaks even one, the test fails. This is what
  lets you improve the tool fearlessly: the net catches mistakes before they ship.
- **`docs/` is the project's "why."** Designs like this live here so a new teammate can understand
  decisions without reverse-engineering them.
- **`package.json` is the one-word command.** It maps `npm test` to "run the safety net," so nobody
  has to memorize a long command.
- **`.github/workflows/` is the robot reviewer.** It re-runs `npm test` automatically every time
  anyone pushes a change to GitHub. A broken change shows a red ✗ and never reaches the team.
- **`README.md` is the welcome mat** — the first thing a new teammate reads.

**Why folders instead of one big pile?** Each folder has one job. When you (or a teammate, or I)
need to change something, the folder name tells you exactly where to look, and a change in one
folder can't accidentally damage another. Small, labeled boxes are easier to understand, safer to
edit, and far easier to teach than one drawer full of everything.

---

## 5. How a change flows (the everyday loop)

This is the routine you'll teach. It's the same five steps every time:

1. **A ticket comes in that the bot got wrong** (or that you want to lock in as correct).
2. **Add it to `tickets/sample-tickets.json`** with the *correct* expected answer.
3. **Run `npm test`.** The new example fails — the parser doesn't handle it yet. That failure is
   your to-do list.
4. **Fix the parser in `app/fedex_bot.html`** until `npm test` is all green, *without* breaking any
   existing example.
5. **Save/commit and publish.** The robot re-runs the tests; the host picks up the new version; the
   team gets it the next time they open the link. The header's version + build date bumps so anyone
   can confirm they're current.

**Why this order matters:** writing the *test first* (step 2) forces you to decide what "correct"
means before you touch the code. It turns a vague "the bot seems off" into a precise, checkable
target — and once it passes, that behavior is pinned forever.

---

## 6. Hosting it privately — the in-tenant host (Path B)

This is the live, click-to-run copy. Two ways IT can provide it; both keep it inside your tenant
(org-only, no public exposure). You only need **one**.

**Option B1 — Azure Static Web App (recommended).** A free-tier service that takes the HTML straight
from your GitHub repo and serves it at a clean https URL. It can require a work-account sign-in so
only your org can open it. Updates are automatic: push to the repo, the site refreshes.

- *Why recommended:* least work, deploys the single HTML file as-is, gives a real URL you can drop
  into a Teams tab, and the org-only sign-in is built in.

**Option B2 — SPFx web part in SharePoint.** The app gets wrapped as a SharePoint "web part" and
deployed to the company app catalog, so it lives natively inside SharePoint/Teams.

- *Why not first choice:* it requires wrapping the HTML in extra developer scaffolding and a build
  step, which is more moving parts for a single-file tool. Pick this only if IT specifically prefers
  everything inside SharePoint.

**The exact request to send IT (copy/paste):**

> "I have a single-file, client-side HTML tool (no server, no database, no outbound data — it runs
> entirely in the browser) that my Desktop Support team needs to open from a link. Can you host it
> for org-only access via an **Azure Static Web App** connected to a private GitHub repo, or tell me
> the approved equivalent? It needs to be reachable as a Teams tab and require work-account
> sign-in. Happy to share the repo."

**Why we frame it that way:** naming that it's client-side and sends no data answers the security
question before it's asked, which is what gets these requests approved quickly.

---

## 7. Before IT delivers — the stopgap

So the team isn't blocked while the in-tenant host is being set up:

- Keep the current `app/fedex_bot.html` in a **SharePoint document library** you own.
- Teammates open it through the OneDrive-synced copy in Edge (or you run the batches yourself for the
  first week).
- This is explicitly temporary and clunkier than a link — it exists only to bridge the gap. The
  moment the in-tenant URL is live, everyone switches to the Teams tab and we retire the stopgap.

**Why mention it at all:** a plan that leaves the team with nothing for two weeks is a plan people
route around (and start emailing copies). A named, temporary bridge keeps everyone on the one
canonical file until the real host arrives.

---

## 8. The front door — what teammates actually click

Once the in-tenant URL exists:

- Add a **Teams "Website" tab** in your team's channel pointing at that URL. One click, the app
  runs in the browser. This is the primary way the team reaches it.
- Mirror it as a **link on your SharePoint site** and a **desktop shortcut/bookmark** for people who
  live in the browser.
- If a Teams embed is ever blocked by page headers, fall back to a plain link tab — same destination,
  zero difference to the user.

**Why a Teams tab is the front door:** your team already lives in Teams all day. Putting the tool
where they already are beats asking them to remember a URL. And because the tab points at *one*
hosted copy, "update everyone" just means "update that copy."

---

## 9. How to teach the team (a 3-minute script)

You can teach the whole thing in three short messages:

1. **"Here's the link."** "Open the **FedEx QuickShip** tab in our Teams channel. That's the tool.
   You never download anything, and it's always the current version."
2. **"Here's how you use it."** "Paste the ticket (or upload the sheet), check the review screen,
   and click export. Your saved data stays in your browser — closing the tab doesn't lose it."
3. **"Here's what to do if it gets one wrong."** "Send me the ticket. I add it as a locked example
   and fix the parser, so it's never wrong on that case again. The tool literally gets smarter every
   time you flag something."

**Why teach it this way:** the team only needs the *front door* and the *flag-it loop* — not the
repo or the tests. Keep their mental model tiny (open the tab, use it, flag misses) and adoption is
easy. The repo and tests are *your* workshop, not theirs.

---

## 10. Security & privacy notes (why private is safe and sufficient)

- The app is **fully client-side**: ticket data pasted by a user is parsed in their own browser and
  never transmitted anywhere. Hosting choice doesn't expose ticket PII.
- Keeping the **repo private** protects the *source* — the sender block and package templates — which
  is the thing you specifically wanted private.
- The **in-tenant host with work-account sign-in** means only your organization can open the running
  app. No public URL exists.
- Result: nothing sensitive is ever public, and the people who can see the code (repo collaborators)
  and the people who can run the app (org members via sign-in) are both controlled by you/IT.

---

## 11. Build checklist (the order we'll do it in)

1. Reshape the three flat files into the `app/` `tickets/` `docs/` structure.
2. Create the missing test harness (`tests/load-parser.js`, `tests/run-regression.js`) and
   `package.json` with the `test` script, so `npm test` actually runs. *(These are described in the
   README but don't exist on disk yet.)*
3. Confirm `npm test` is green on the current 22 tickets.
4. `git init`, first commit, push to a **private** GitHub repo; invite collaborators you trust.
5. Add `.github/workflows/test.yml` so tests auto-run on every push.
6. Set up the **SharePoint stopgap** copy (Section 7) so the team has access immediately.
7. Send the **IT hosting request** (Section 6) for the Azure Static Web App.
8. When the in-tenant URL is live: add the **Teams tab** (Section 8) and retire the stopgap.
9. Teach the team with the 3-minute script (Section 9).

---

## 12. Open questions

- **Who are the repo collaborators?** Just you, or a couple of trusted teammates who'll also edit?
- **Does IT prefer Azure Static Web App or SPFx?** Either works; B1 is less effort.
- **GitHub account:** personal free account, or does Aspen Dental have an org/Enterprise GitHub we
  should use instead (which would also unlock private Pages as an alternate host)?
- **Stopgap duration:** acceptable to run batches yourself for the first week, or do teammates need
  the synced copy from day one?

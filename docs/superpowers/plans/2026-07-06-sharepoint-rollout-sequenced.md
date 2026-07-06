# FedEx QuickShip - SharePoint Rollout (Sequenced) and Connector Plan

- **Date:** 2026-07-06
- **Status:** Approved sequencing (Daniel, 2026-07-06). Track A ready to execute.
- **Owner:** Daniel Yonan - Desktop Support (PSC3), Aspen Dental
- **Decision:** Move the app to SharePoint in three ordered tracks. Ship hosting first (it is already built). Add a shared SharePoint list next. Keep FedEx live labels on its own track. Do not do them at once.

This plan sequences work that is already decided or built. It does not replace the
hosting design (`docs/superpowers/specs/2026-06-01-fedex-quickship-repo-hosting-design.md`,
which chose SPFx as spec option B2) or the FedEx live-label design
(`docs/superpowers/specs/2026-06-19-fedex-live-label-api-design.md`). It puts them in order
and adds one new track (the shared list) for your decision.

---

## 1. The sequence at a glance

```
  TRACK A  Hosting            ── ship now ──▶  the team opens one hosted copy (Teams tab / SharePoint page)
  TRACK B  Shared list        ── next ─────▶  the queue and history live in a SharePoint list, not per browser
  TRACK C  FedEx live labels  ── separate ──▶  auto-create and print labels through a Power Automate flow
```

Why this order. Track A is done in source and unblocks everything else, because B and C both
need the app hosted in SharePoint first. Track B is cheap once A is live, because an SPFx web
part runs inside SharePoint as the signed-in user and can read and write a SharePoint list with
no extra server. Track C is a bigger build with outside parts (a flow, a secret store, premium
licensing, a Zebra printer), so it must not ride along with the hosting push or it sinks it.

---

## 2. The gating truth: nothing is handed off yet

The SPFx package exists and is build-ready, but it has never been sent to IT or the SharePoint
team. So you have no signal yet on what your tenant will allow. Every track depends on that
answer. The highest-value move is to send one message that surfaces all three permissions in a
single round, so you learn the whole picture at once instead of three times. That message is in
Section 6.

---

## 3. Track A - Hosting (ship now)

**State:** The `spfx/` solution wraps the one app file (`app/fedex_bot.html`, v0.4.0) as a
SharePoint web part and a Teams tab. The app is fully self-contained (Tailwind baked in, no
outside requests), so it runs inside SharePoint with nothing to fetch. The web part shows the
app in an iframe on the SharePoint page origin, so each user's saved queue (localStorage) and
CSV downloads keep working.

**What is left, and who does it.** Only two mechanical steps remain, and both run off this
machine because it cannot reach GitHub, Azure, or the tenant:

- [ ] Build the `.sppkg` on a Windows machine with Node 22.
- [ ] Deploy it to the tenant App Catalog and put it in front of the team (Teams tab or a page).

Both are written out click by click, each step with its own check, in the runbook:
`docs/superpowers/runbooks/2026-07-06-spfx-build-and-deploy.md`.

**Lighter fallback (IT's call).** Because the app is one self-contained file, IT can also host
the raw `app/fedex_bot.html` without the SPFx build (for example an Azure Static Web App, spec
option B1, which is less work). The IT ask offers both so IT picks the path they prefer.

---

## 4. Track B - Shared SharePoint list (propose next)

**The idea.** Today each person's queue lives in their own browser. A shared SharePoint list
would hold the team's queue and shipment history in one place, visible to everyone, surviving a
cleared browser or a new machine. This is the "connector" that most changes the tool.

**Why it is cheap after Track A.** Once the app is an SPFx web part, it runs in the SharePoint
page as the signed-in user. It can read and write a SharePoint list through the built-in
SharePoint REST API with no Azure, no separate backend, and no secrets to hold. This is the one
connector SharePoint gives you almost for free.

**What it fixes.** It replaces the per-browser, multi-tab durability problem you already worked
around with localStorage merge-on-write. A list is the natural shared store and removes that
whole class of "only the last entry survived" bugs.

**The real caveat to clear first (governance, not code).** Today recipient names and addresses
never leave the user's browser, and the hosting design leans on that for privacy (spec section
10). A shared list moves that shipment data into the tenant, where it is stored on the SharePoint
site. It stays inside your organization and behind work-account sign-in, so it is very likely
fine, but it is a data-handling change. Confirm it with IT or security before building, do not
assume it. This is a question in the IT ask below.

**Status:** Design later. Blocked on Track A being live and on the governance answer. No parser
or CSV change is implied; the list would store the same shipment rows the app already builds.

---

## 5. Track C - FedEx live labels (separate track, already specced)

**State:** Phase 1 is built and green. `buildShipRequest(row)` maps a queue row to a FedEx Ship
API request (`tests/ship-request.test.js`, 3/3). The backend design is a Power Automate flow that
holds the FedEx account and secrets, planned in
`docs/superpowers/plans/2026-06-19-fedex-flow-phase2.md`, proven by hand first with
`docs/superpowers/runbooks/2026-06-19-fedex-sandbox-label-proof.md`.

**Why it stays separate.** It needs a Power Automate premium flow, Azure Key Vault, premium
licensing, a Zebra thermal printer with Browser Print, and IT sign-off. Bolting it onto the
hosting push delays the hosting push. Ship A, then decide B, then take on C on its own timeline.

**Status:** Own track. Do not start the flow build until the hosting is live and premium
licensing is confirmed.

---

## 6. The one message to send IT / the SharePoint team (paste-ready)

Send this once. It asks for hosting now and floats the two connectors so you learn all the
permissions in one reply.

> Subject: Hosting a small internal web tool in SharePoint, plus two follow-on questions
>
> I maintain a single-file, client-side web tool for my Desktop Support team. It turns
> ServiceNow tickets into FedEx shipping CSV files. It runs entirely in the browser, has no
> server, and sends no data out.
>
> 1) Hosting. I have it packaged as an SPFx web part (supports a SharePoint page and a Teams
>    tab). Can you deploy it to our tenant App Catalog for org-only use, reachable as a Teams
>    tab? If you would rather not run the SPFx build, the app is one self-contained HTML file
>    and can instead be hosted as-is (for example an Azure Static Web App with work-account
>    sign-in). Either path is fine; tell me which you prefer and I will hand over the files.
>
> 2) Shared data (next step). I would like the tool to read and write a SharePoint list on our
>    team site, so the shipment queue is shared instead of living in each person's browser. The
>    list would hold recipient name and address for each shipment, stored in-tenant and behind
>    sign-in. Is that acceptable, and is there a preferred site or list location?
>
> 3) Automation (later). Down the line I want it to create and print FedEx labels through a
>    Power Automate flow that holds our FedEx account in Azure Key Vault. Would a premium
>    Power Automate flow and a Key Vault be approved for my team?
>
> Happy to walk through any of it. Thanks.

- [ ] Send the message above to your IT or SharePoint-team contact.
- [ ] Record their answers in Section 7.

Verify: you have a yes or no on hosting with a named owner, plus a read on the list and the flow.

---

## 7. Answers and open questions (fill in as they come back)

- Hosting path IT chose (SPFx or self-contained HTML): `__________`
- Named owner and ETA for hosting: `__________`
- Shared SharePoint list allowed, and site/list location: `__________`
- Premium Power Automate + Key Vault allowed for the team: `__________`
- Repo collaborators (just you, or trusted teammates too): `__________`

---

## 8. How this maps to the existing specs (no conflict)

- Hosting via SPFx = spec `2026-06-01-...-repo-hosting-design.md` section 6, option B2 (already
  chosen because the SharePoint team asked for it). Track A executes it.
- Self-contained app with no outside requests = the 2026-06-11 day-one hardening. It is what
  makes both hosting paths simple.
- FedEx live labels = the 2026-06-19 design and Phase 1/Phase 2 docs. Track C continues it.
- Shared SharePoint list = new here. It is proposed, not built, and waits on your go and IT.

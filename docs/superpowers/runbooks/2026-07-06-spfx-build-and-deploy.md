# FedEx QuickShip - SPFx Build and Deploy Runbook

- **Date:** 2026-07-06
- **Owner:** Daniel Yonan - Desktop Support (PSC3), Aspen Dental
- **Who runs this:** You or IT, on a real Windows machine and in the Microsoft 365 admin UIs.
  This assistant's machine cannot reach GitHub, Azure, or the tenant, so these steps are for a
  human. Do not skip a step until its Verify line is true.

**Goal:** Turn the `spfx/` source into a deployable `.sppkg`, then deploy it so the Desktop
Support team opens one hosted copy from a Teams tab or a SharePoint page.

**What you are shipping:** the app `app/fedex_bot.html` (v0.4.0), wrapped as the "FedEx QuickShip"
web part. The build re-embeds the current app automatically, so you never copy the app by hand.

---

## Part 1 - Build the package (Windows machine with Node 22)

### Task 1: Install the toolchain

- [ ] **Step 1: Install Node.js 22 LTS.** Get it from https://nodejs.org (the "22 LTS" line).
  The package requires Node 22 (`>=22.14.0 <23.0.0`).

  Verify: open a terminal and run `node -v`. Expected: it prints `v22.` followed by the rest.

- [ ] **Step 2: Get the repo onto the machine.** Use your existing clone, or in GitHub Desktop
  clone the repo that holds this project. Open a terminal in the `spfx` folder inside it.

  Verify: `dir` (or `ls`) in that folder shows `package.json`, `gulpfile.js`, and a `src` folder.

### Task 2: Build the .sppkg

- [ ] **Step 1: Install dependencies.** In the `spfx` folder run:

  ```
  npm install
  ```

  The first run downloads a lot and can take several minutes.

  Verify: a `node_modules` folder appears and the command ends with no red `ERR!` lines.

- [ ] **Step 2: Build and package in one command.** Run:

  ```
  npm run package
  ```

  This runs four steps for you: it re-embeds the current app, cleans, bundles for release
  (`--ship`), and creates the solution package (`--ship`).

  Verify: the run ends without an error, and the file
  `spfx/sharepoint/solution/fedex-quickship.sppkg` now exists. (It is a few hundred KB.)

- [ ] **Step 3: Confirm it embedded the current app.** This is the file-integrity check that
  matters, because a stale embed would ship an old app.

  Verify: the build log line from the embed step reads about `155,000` characters or more, and
  the app header in the running app (after deploy) shows `QuickShip v0.4`.

---

## Part 2 - Deploy to the tenant App Catalog (SharePoint admin)

> You need SharePoint admin rights, or hand the `.sppkg` and this section to whoever does.

### Task 3: Upload and deploy tenant-wide

- [ ] **Step 1: Open the tenant App Catalog.** Go to the SharePoint admin center
  (https://<your-tenant>-admin.sharepoint.com) then **More features -> Apps -> Open**, and open
  the **Apps for SharePoint** library. If you already know the App Catalog site URL, go straight
  there.

  Verify: you see a library titled **Apps for SharePoint**.

- [ ] **Step 2: Upload the package.** Drag `fedex-quickship.sppkg` into **Apps for SharePoint**
  (or use **Upload**).

  Verify: a trust dialog opens showing the solution name **FedEx QuickShip**.

- [ ] **Step 3: Make it available everywhere, then deploy.** In the dialog, check
  **Make this solution available to all sites in the organization**, then select **Deploy**.
  (This checkbox appears because the solution is set to tenant-wide deployment, which is what
  lets the Teams tab find it.)

  Verify: back in the library, the app row shows **Deployed = Yes** and the
  **App Package Error Message** column is empty.

---

## Part 3 - Put it in front of the team

You can use a SharePoint page, a Teams tab, or both. Teams is the primary front door.

### Task 4a: SharePoint page (fastest to test)

- [ ] **Step 1:** On your team's SharePoint site, open a page and select **Edit**.
- [ ] **Step 2:** Select **+**, search **FedEx QuickShip**, and add the web part. **Republish**
  the page.

  Verify: the app loads on the page. Paste a sample ticket and confirm it parses.

### Task 4b: Teams tab (primary front door)

- [ ] **Step 1: Sync the app to Teams.** Back in **Apps for SharePoint**, select the
  **FedEx QuickShip** row, then on the **Files** tab of the ribbon select **Sync to Teams**.

  Verify: a success message appears at the top right. (If it fails, remove any older FedEx
  QuickShip app from the Teams admin catalog first, then sync again.)

- [ ] **Step 2: Add the tab in your channel.** In Teams, open your team's channel, select **+**
  to add a tab, search **FedEx QuickShip**, select it, then **Add** and **Save**. If you do not
  see it yet, wait a few minutes for caching.

  Verify: the tab opens and the app runs inside Teams. Paste a sample ticket and confirm it
  parses, then export a CSV and confirm the file downloads.

- [ ] **Step 3: Retire any interim copy.** If the team was opening a synced or emailed copy,
  remove it or mark it **RETIRED - use the Teams tab**. One hosted copy only.

  Verify: no one is opening a local or emailed copy anymore.

---

## Part 4 - Shipping updates later

When the app changes (a parser fix or a new ticket), the flow is the same as your push workflow,
plus a repackage:

- [ ] Bump the version in `spfx/config/package-solution.json` (for example 0.4.0.0 to 0.4.1.0)
  so the catalog sees a new version.
- [ ] Run `npm run package` again to rebuild the `.sppkg` with the current app.
- [ ] Upload the new `.sppkg` to **Apps for SharePoint** and **Deploy** (overwrites the prior
  version). Every hosted instance updates automatically.

  Verify: the app header on the live tab shows the new version after a refresh (Ctrl+F5).

**Rollback:** keep the previous `.sppkg`. To revert, re-upload it and deploy.

---

## Fallback - host the raw file instead (IT's choice)

Because the app is one self-contained file with no outside requests, IT can skip the SPFx build
and host `app/fedex_bot.html` directly (for example an Azure Static Web App with work-account
sign-in, which is spec option B1 and less work). Same app, fewer moving parts. See
`docs/superpowers/specs/2026-06-01-fedex-quickship-repo-hosting-design.md` section 6.

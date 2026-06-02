# FedEx QuickShip — Team Quick Start

**What this is:** a tool that turns a messy ServiceNow ticket into a ready-to-ship FedEx file,
so you don't have to retype addresses. You do three things: **1) build the file, 2) upload it to
FedEx, 3) print the labels.** No shipping experience needed — just follow the steps.

```
  ServiceNow ticket  ──▶  QuickShip (make the file)  ──▶  FedEx Ship Manager (make the labels)
```

---

## Part 1 — Build the shipping file in QuickShip

1. **Open the tool.** Click the **FedEx QuickShip** link (in Teams / your bookmark). It opens in
   your browser — nothing to install.
2. **Check the "From" (sender).** At the top, leave the default sender profile selected unless you
   were told otherwise.
3. **Paste the ticket.** Copy the whole ServiceNow ticket and paste it into the big box.
4. **Click "Parse."** The tool reads the ticket and fills in the recipient's name, address, and the
   equipment to ship.
5. **Check what it filled in.** Glance at the name, address, and items. Anything it's unsure about
   is flagged — fix those by typing the correct value. (See "Good to know" below.)
6. **Click "Add to batch."** That adds this shipment to the list at the bottom.
7. **Repeat 3–6 for each ticket** you need to ship. They stack up in the batch list.
8. **Export the file.** When the list is complete, click **Generate CSV** (or **Download CSV**).
   That's your shipping file — one row per package. Save it somewhere you can find it.

That's the whole tool. Your saved work stays in your browser, so closing the tab won't lose it.

---

## Part 2 — Upload the file to FedEx and print labels

> Do this on a **desktop computer** — FedEx batch upload doesn't work on phones or tablets.

1. **Sign in to FedEx Ship Manager** (the same FedEx account your team uses for shipping).
2. **Find the batch/upload option** — look for **"Upload," "Import,"** or **"Create multiple
   shipments."** *(Your team's exact menu name goes here — ask your lead the first time.)*
3. **Choose the CSV file** you exported from QuickShip.
4. **Confirm the columns if asked.** The file already uses FedEx's field order, so usually you just
   confirm and continue.
5. **Review the shipments**, then **process the batch.** FedEx creates a label for every row.
6. **Print the labels** and tape one to each box. You're done.

**First time? Test with one or two rows** before running a big batch, so you can see the whole flow
end-to-end. FedEx lets you upload up to **1,000 shipments at once**.

---

## Good to know (the few rules the tool follows)

- **"Not being shipped" tickets are held back.** If a ticket says *Is this being shipped: No*, the
  tool flags it and won't include it — that gear isn't meant to be couriered. That's correct, not a
  bug.
- **Missing phone number?** The tool auto-fills a default office number and flags it, so a shipment
  is never blocked just because the ticket had no phone.
- **New-hire tickets** ship to the **new hire**, not the person who submitted the request.
- **No street address in the ticket?** The tool can't invent one — it flags the missing
  address/city/ZIP so you can add it before exporting.
- **It got something wrong?** Send the ticket to the tool's owner. They lock it in as an example
  and improve the parser, so it won't make that mistake again.

---

## Mini-glossary

| Term | Plain meaning |
|---|---|
| **Batch shipping** | Creating many shipping labels at once from one file, instead of one at a time. |
| **CSV** | A simple spreadsheet-style file (one shipment per row) that FedEx can read. |
| **Parse** | The tool reading the ticket and filling in the shipping fields for you. |
| **Ship Manager** | FedEx's website/app where you upload the file and print labels. |
| **Queue / batch** | The running list of shipments you've added but not yet exported. |

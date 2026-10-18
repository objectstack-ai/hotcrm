---
"hotcrm": patch
---

**Your changes to HotCRM's sample records now survive a server restart.** The sample accounts, contacts, deals and their line items, tasks, meetings and attendees, campaigns and their members, products, contracts, quotes and their line items, cases and knowledge articles were written back on every boot. Anything you changed on one of them was undone by the next restart: a completed task reopened, a deal you moved went back to its old stage, a product's new price returned to the shipped one, and a contact you marked as an account's primary contact lost the flag to the sample contact again.

These sample records are now added once, on the first boot of a database that does not have them, and a later boot leaves them alone. The sample leads already worked this way.

What this costs, knowingly: the dates on the sample records (due dates, close dates, meeting times, campaign, contract and quote dates) now keep the values from the day the records were added, and no longer move forward on each boot. On a demo database that runs for weeks, sample tasks fall overdue and sample deals pass their close dates, the way real ones would. And a sample record that a later HotCRM release changes reaches only a database that does not have that record yet: an existing database keeps the version it was given. Reset the demo database (`pnpm demo:reset`) to start again from the shipped sample data.

The sample entries on a lead's activity timeline are added once too, so each one keeps matching the call or meeting it records. One kind of sample row still follows each boot: the forecast snapshots move with the calendar so the forecast history stays current, so a change you make to a sample forecast snapshot is still written back on the next restart. The current quarter's forecast, which the nightly sweep creates, is never a sample row.

A sample record that a restart has already reset stays as the restart left it: make the change again, or reset the demo database. Records you create yourself were never affected.

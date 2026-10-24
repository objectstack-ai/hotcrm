---
"hotcrm": patch
---

HotCRM now ships as one artifact carrying four packages: the HotCRM app and its Service, Revenue and Marketing modules. It still installs as one app, and the one change a user sees is the order of the **Sales** menu: **Quotes**, **Contracts** and **Products** now come after **Sales Performance**.

**What changes for an installation.** The artifact still installs as one app, **HotCRM** (`app.objectstack.hotcrm`), and every object keeps its name, its table and its REST path. Inside it, products, opportunity line items, quotes, quote line items and contracts now belong to **HotCRM Revenue** (`app.objectstack.hotcrm.revenue`), and campaigns and campaign members to **HotCRM Marketing** (`app.objectstack.hotcrm.marketing`), both modules of the app like **HotCRM Service**. The package list (`GET /api/v1/packages`, and the package picker in Studio) shows all four rows, and each object reports the package that owns it.

**One navigation difference.** The Revenue module puts **Quotes**, **Contracts** and **Products** into the **Sales** group, and the Marketing module puts **Campaigns** into **Marketing**. A module's entries come after the app's own entries in a group, so the **Sales** group now reads: Leads, Accounts, Account Workbench, Contacts, Opportunities, Sales Performance, Quotes, Contracts, Products. Before, **Sales Performance** was last. **Marketing** still holds only **Campaigns**, and every other menu entry is where it was.

**What does not change.** The permission sets stay whole in the HotCRM app package, so no one's access moves. Translations, the CRM Overview dashboard and the opportunity and lead record pages stay in the app package too. Seeded demo data is the same, row for row. Four items authored for the new modules are still part of the app package for now — the Generate Quote flow, the two flows that add a lead or a contact to a campaign, and the product metrics behind CRM Overview's **Top Products** tile — because the platform does not yet let an app action or dashboard reach them in another package (objectstack-ai/objectstack#25514). They move to their modules in a later release, with no change a user sees.

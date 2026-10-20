---
'hotcrm': patch
---

The demo administrator can export lists, and the admin docs say export is granted, not implied

Since ObjectStack 18 the platform's own administrator access carries no export, so on a fresh demo box the dev
admin (`admin@objectos.ai`) could not export any list: the list's **Display** panel offered no **Export**, and the
export API refused it. `pnpm demo:staff` now assigns the app's **System Administrator** profile to the dev admin, as
the first thing it does, so the dev admin exports the **Leads**, **Accounts**, **Contacts**, **Opportunities** and
**Cases** lists, and nothing that profile does not grant. No profile's grants change.

The Profiles page and the in-product administration notes now say that export comes from a profile: an
administrator, the account that set the deployment up included, exports nothing until **System Administrator** (or
another profile that grants export) is assigned to them.

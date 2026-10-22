---
'hotcrm': minor
---

HotCRM now offers one default permission set to every member, so an invited colleague can open the CRM without a profile

On a hosted environment, a colleague the organization invites is signed in and created on first visit, holding only
the platform's own baseline: their profile, preferences and inbox. With HotCRM installed they still saw no CRM object
until an administrator assigned them a profile, person by person, in **Setup → Users**.

- **New permission set: CRM User (`crm_user`), the package's default.** Installing HotCRM now puts a suggestion on its
  package page in the **Marketplace**: *This app suggests granting "crm_user" to all signed-in users (the Everyone
  position).* One **Grant** gives it to every signed-in member, people invited later included. **Revoke** on the same
  panel takes it back.
- **What it gives.** Each member creates, reads and edits their **own** leads, accounts, opportunities, tasks and
  events, reads the contacts, quotes, contracts and line items under the records they can see, and reads the product,
  campaign and knowledge catalogues. It deletes nothing, exports nothing, and carries no View All, Modify All or system
  permission. Every grant in it is one the Sales Representative profile already makes, so a rep gains nothing new.
- **Why not Sales Representative.** The platform refuses to give everyone a set that can export, delete or see every
  record, and Sales Representative does all three, so a narrower set was written for this purpose.
- **Nobody's field security changes.** CRM User masks no field and opens no field, so every profile reads and edits the
  same fields it did before.
- **Self-hosted servers (`objectstack serve`)**: every signed-in member holds CRM User from the start, and the
  suggestion already shows as accepted.

The default set is described under **Default set for every member** on the Profiles page, in all three languages.

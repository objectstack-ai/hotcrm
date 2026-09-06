---
'hotcrm': patch
---

Correct **Who can edit** on the Forecasting page: a sales rep reads their own
forecasts, they do not edit them. The page told reps the opposite, and the Sales
Rep profile has never granted it — a rep who followed the page, opened their
snapshot and changed a number could not save it, with nothing on the page to
explain why.

Every sentence in the section is now derived from `src/profiles/*.ts` rather than
from a remembered permission model:

```
sales-rep.profile.ts      crm_forecast: allowCreate: false, allowRead: true,
                                        allowEdit: false, allowDelete: false,
                                        viewAllRecords: false, modifyAllRecords: false,
                                        readScope: 'own'
sales-manager.profile.ts  crm_forecast: allowCreate: true,  allowRead: true,
                                        allowEdit: true,  allowDelete: false,
                                        viewAllRecords: true,  modifyAllRecords: true
system-admin.profile.ts   crm_forecast: allowCreate: true,  allowRead: true,
                                        allowEdit: true,  allowDelete: true
```

Three claims in those four lines were wrong, and they are corrected together
because they are one sentence apart and one reader's question — *can I change
this number, and if not, who can?*

- **Reps read, they do not write.** The correction says where writing lives
  instead of stopping at "no": the nightly snapshot job and the sales manager are
  the writers, so a rep who wants a number changed goes to their manager.
- **"Sales operations" is not a profile.** The page granted a persona nothing
  implements — `src/profiles/` holds `guest-portal`, `marketing-user`,
  `sales-manager`, `sales-rep`, `service-agent`, `system-admin` and
  `tenant-admin`, and no sales-operations anywhere. The authority the sentence
  described — see every forecast, override any number — is real and belongs to
  the sales manager, so it moves onto the manager's line rather than being
  deleted along with the persona.
- **Deleting a forecast is an admin action**, and the section did not say so.
  That matters more than it reads: deleting the row is how a suppressed period is
  handed back to the nightly sweep, so a manager who wants automation back needs
  to know the last step is not theirs. The page already stated the rule under
  *How forecasts get created*; **Who can edit** now carries it as a roster row
  rather than a second, differently worded copy.

One more sentence in the same file was making the same claim and is corrected
with them: the **Source** table glossed `manual` as *rep entry*, contradicting
both the corrected section and the page's own *How forecasts get created*, which
already said a manager enters the number. It now reads *manager entry*.

All three locales — `forecasting.mdx`, `.zh-Hans.mdx`, `.zh-Hant.mdx` — carry the
same corrections, so no locale is left telling reps something the other two no
longer do. `content/docs/administration/profiles.mdx` needed no change: it
already describes a rep as reading their own snapshots and never writing one, in
all three locales, and the two pages now agree with each other and with the
metadata.

No permission changes. Nothing widens; the prose narrows to what the profiles
have always enforced.

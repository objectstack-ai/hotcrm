---
'hotcrm': patch
---

**4.0.1 is the first 4.x release that installs whole.** HotCRM 4.0.0's marketplace publish
carried an empty app and was withdrawn, so an installer upgrades from 3.x straight to 4.0.1.
That upgrade still carries 4.0.0's one-time step: convert the contact mailing addresses with
`scripts/backfill-contact-mailing-address.ts` before `os migrate apply --allow-destructive`.
The 4.0.0 entry of `CHANGELOG.md` holds the commands.

4.0.0's empty app had no objects, views, dashboards, flows or sample data, so a hosted
install of it had nothing to show. 4.0.1 publishes the whole app, including the Cases,
Knowledge and Service Overview entries in the app's navigation, and the publish now stops
with an error instead of uploading an app that is missing any of its objects.

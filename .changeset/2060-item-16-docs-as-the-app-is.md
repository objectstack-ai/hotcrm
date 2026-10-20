---
"hotcrm": patch
---

**The product docs, the feature inventory and the admin guide now describe the app as it ships.** Nothing in the app changes; each corrected sentence was measured in the running app, the engine or the source first.

- **Cases.** The case detail screen is made of the object's field groups (Case Information, Origin & Routing, SLA & Priority, Escalation, Resolution, System). The page used to say it had three sections of its own and that Escalated Date and First Response Date appeared on no screen; both are on the Details tab, and an Attachments panel sits below the tabs. The Activity timeline has no email stream (Send Email is a contact action). The account's last activity date moves when a case reaches Resolved or an interaction is recorded on it, not on every case update.
- **Activities and opportunities.** An account, lead, opportunity or case lists its tasks and events on its Related tab; its timeline carries logged calls and meetings, not tasks, and a completed task adds nothing to it. The opportunity timeline has no emails and no task completions.
- **Contacts and accounts.** The primary contact is not a default anywhere: you pick the contact on each opportunity, quote and contract. The Primary Contacts list is the place the flag shows.
- **Knowledge base.** The Published tab lists the most Helpful Votes first (there is no view count).
- **Forecasts.** A forecast record has three sections, Snapshot, Amounts and Source (collapsed); the form arranges them as Snapshot, Amounts and Notes.
- **Sandbox and releases.** HotCRM ships 20 seed families, not 21; nineteen insert once and the forecast snapshots upsert.
- **Admin guide** (`src/docs/crm_admin.md`). The sharing table lists Unassigned Cases — Triage, and the permission sets include Service Manager.
- **Feature inventory** (`docs/feature-inventory.md`). Eighteen rows corrected: the account tabs and delete guard, the case fields and the escalation hand-off, the article review date, vote counts and Published order, campaign enrollment and Mark Responded, the quote and forecast defaults, the Activity group, seven permission sets, eleven sharing rules, each persona's landing page, Sales Home, and the seed data.

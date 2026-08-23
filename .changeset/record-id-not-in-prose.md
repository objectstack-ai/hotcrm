---
"hotcrm": patch
---

Name records by their name, not their record id, everywhere a sentence is written for a person to read.

Eight places still put a raw primary key into text a user sees. In a demo org that meant 15 of 31 tasks in **All Tasks** were titled by a 16-character opaque key, a freshly drafted contract explained its own origin as `Auto-drafted from accepted quote MvNopWgEDZwm2T5L`, and a rep blocked from saving a duplicate contact was told `Another contact (5B0nItHGRr768EfD) with email … already exists.` — a string that appears on no screen in the app and cannot be pasted into search.

Each now names the record the way every other surface does:

- **Follow-up task on a qualified lead** — `Follow up with qualified lead: Mira Costa - Atlas Construction` (was `Follow up with qualified lead (EMtmaScoa3I-uYFG)`).
- **Activation task on a won opportunity** — `Activate new customer for opportunity Skyline Media - Platform Renewal`.
- **Contract drafted from an accepted quote** — `Auto-drafted from accepted quote QTE-0006 - Skyline Media Renewal`.
- **Duplicate-email refusal** — names the contact that already holds the address.
- **Delete refusal on a referenced contact**, and the three record-freeze refusals on **closed opportunities**, **accepted quotes** and **converted leads** — all now identify the record by name instead of appending its id.

The id is not lost: it stays in the relationship field that exists to carry it (`related_to_lead`, `related_to_opportunity`, …). Ids destined for a server log are unchanged — that is the right thing there.

`pnpm hygiene` now fails the build when an id is interpolated into a template literal anywhere in `src/`, unless the string lands in a diagnostic sink, so the next instance of this is a red build rather than something a walkthrough finds.

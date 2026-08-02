---
'hotcrm': patch
---

Sharing docs now describe the record-level access the app actually ships.

A sharing rule widens the object it names, not the records hanging off it. HotCRM
authors its widening rules on Account (territory + account team), so a rep who
receives an account that way reads the account and its contacts — while the
quotes, contracts and tasks on it stay owner-only and opportunities widen only
through the ≥ $100k leadership rules. The admin and contract docs claimed the
opposite ("contracts follow the account's sharing", "you're on the account
team"), promising a 360° view that record-level security never delivered.

What changed:

- **Sharing & Security** gains a per-related-list table of what a shared account
  really carries, and states that making a child follow the account is a
  deliberate widening for every holder of that object.
- **Contracts** documents owner-only visibility, plus who does hold View All.
- **FAQ** drops the "are you on the account team?" diagnostic step.
- **Layer 4** is now *Manual shares*: HotCRM ships no account-team roster or Team
  tab, and the rule named *Account Team Sharing* is an ordinary criteria rule for
  `sales_manager`.

No permission set, OWD or sharing rule changed — whether quotes, contracts and
tasks should follow the account is a business decision still open in #549. New
guards in `test/sharing-coverage.test.ts` pin the shipped answer per account
child and keep the docs matching the metadata.

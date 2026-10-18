---
'hotcrm': patch
---

**`pnpm demo:staff` now leaves two large-deal approvals waiting for the sales manager, each submitted by the rep who owns the deal.** Before, the script opened these requests while handing the demo deals to the reps. Its ownership update ran as the dev admin, so both **Large Deal Approval** requests named the dev admin as requester.

The script now does it in this order:

1. It hands the deals over through the data import with automations off, so the hand-off opens nothing.
2. It re-evaluates the sharing rules.
3. Each demo person signs in and saves the deals they were given. The save changes no field.

On a new demo database, **Acme Platform Upgrade** and **Wayne Enterprise License** each open **Sales Manager Review** on Nina Reyes's save (`na.rep@objectos.ai`). Both wait in Marta Quinn's **Approvals Inbox** (`sales.manager@objectos.ai`), and the dev admin's inbox stays empty. Once Marta approves Wayne's request, its director sign-off goes to the dev admin, because nobody holds the sales director position. The script approves nothing itself. At the end it prints each request with its requester and approver, and it exits non-zero if any request it opened does not name the deal's owner as requester.

Leads, tasks and events are handed over as before. Running the script again changes nothing.

---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**HotCRM 6.5.0, as published on 2026-11-18, already included more than its own notes say, and it requires ObjectStack 18.6.0.** The 6.5.0 notes were written when the release was prepared on 2026-11-17, and they say it stays on ObjectStack 18.5.0. The 6.5.0 that was published runs on ObjectStack 18.6.0 and needs the host upgraded to 18.6.0 first. It already included:

- the **Expenses** app: expenses for every employee, sent on an expense report that the spender's manager approves (the project manager, for a project's expenses) and finance marks paid; **travel requests** with their itinerary lines, approved before the trip and cited by the reports spent on it; **expense standards** kept by finance, with Review Notes on each expense; and two expense skills for an assistant;
- **Orders** with their order lines under the account, in the Sales and Order to Cash apps, and a project that names the order it delivers;
- on leads, **Qualify Lead**, and a first call, meeting or email that moves a New lead to Contacted; on opportunities, an **Update Stage** that respects permissions and approval locks, and win and loss reasons on a closing deal only;
- what ObjectStack 18.6.0 brings: a refused time entry leaves no empty timesheet behind, import mappings are named in the reader's language, and the analytics figures are found in more everyday words;
- smaller fixes: consultants no longer see an account's Order to Cash totals, a notification missing a value is not sent with a blank in it, Renewal Notice (Days) is capped at 120, a forecast a person saves is Manual entry, a campaign can start and end on the same day, a short printed quote no longer leaves a third of its first sheet blank, and a project's Overview shows its fields again.

Each of these is described in full further down these notes, for an installation coming from 6.4.0 or earlier. For an installation already on 6.5.0, the rest of these notes is what is new since 6.5.0.

**Upgrading from 6.4.0 with typed Approved Budgets.** From 6.5.0 a project's Approved Budget is the total of its approved budget version, no longer a typed figure, so an installation coming from 6.4.0 is asked to confirm a schema change for `crm_project.approved_budget` (currency to summary) before the upgrade goes ahead. Confirming keeps each project's typed figure, and the Approved Budget reads it until the project's budget versions change. If those figures are real budgets, not the 6.4.0 sample projects, run `scripts/backfill-project-budget-baseline.ts` from the HotCRM repository against your own organization (`--url`, `--email`, `--password` of an administrator) once the upgrade is confirmed, and before anyone adds a budget version to those projects; it needs 6.5.0's budget versions, so it cannot run on 6.4.0. For each project with a typed Approved Budget and no budget version it writes a version 1 holding that figure, Approved for a project already approved and Draft for one not yet sent, so the Approved Budget reads the same amount. A project in approval is left alone and listed: run the script again once it is decided. It only reports until run with `--apply`, never touches a project that already has a budget version, and can be run again safely. A project that gets a budget version before the script runs is skipped, and its Approved Budget then reads the sum of its versions instead of the typed figure.

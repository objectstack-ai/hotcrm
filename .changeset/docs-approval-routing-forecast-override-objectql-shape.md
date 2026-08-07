---
'hotcrm': patch
---

Three product-doc claims now say what the app does, instead of what it sounds
like it should do — and two of the three families get a guard.

**Setup, Day 2 (#1024).** The checklist told admins to *"Set a manager for each
user (drives approval routing)"*. Nothing in HotCRM reads a user's manager:
`manager_id` and `own_and_reports` have zero occurrences in `src/`, every sharing
rule is position-based, and a flow template cannot even dot-walk
`{record.owner_id.manager}` — it interpolates to the literal `"undefined"`. What
approvals actually resolve is a **position**: `sales_manager` above $100K,
`sales_director` above $500K, snapshotted when the request opens. So the step an
admin needed and never got is now the one on the page — staff both positions,
because an unheld position opens the request with an **empty approver slate**
while `lockRecord: true` holds the deal (`onEmptyApprovers: 'admin_rescue'` is
the rescue, not the design). Section 12's *"approvers (manager + director by
role)"* is rewritten the same way; the Manager field is documented as what it is
— platform org data this app never consults.

**Forecasting, Who can edit (#1025).** The list promised that *"Sales operations
see all forecasts and can override any number"*. There is no Sales Operations
profile — HotCRM ships six, and `View All` / `Modify All` on Forecast is held by
**Sales Manager** and **System Administrator** only. The line now names the
second real profile instead of a persona nobody can be assigned to.

**Glossary, ObjectQL (#1026).** The one copyable example on the page was
`broker.find('crm_opportunity', { filters: [...] })` — an identifier with zero
occurrences in `src/`, plus the predicate alias that fails **silently** in
process (`findOne` returns the object's first row, `count` counts the whole
object, neither throws). It now reads
`ctx.api.object('crm_opportunity').find({ where: … })`, the shape AGENTS.md
fixes, in all three locales.

Two new guards keep these from drifting back: `test/docs-objectql-examples.test.ts`
(no `broker` in a docs code fence, and no `filter` / `filters` predicate key in an
in-process `ctx.api` example — flow node configs, page component configs and HTTP
bodies keep their own legitimate `filter` spelling), and
`test/docs-approval-routing.test.ts`, which reads the approver descriptors out of
`src/flows/*.flow.ts` and requires the setup checklist to name every position
approvals route to.

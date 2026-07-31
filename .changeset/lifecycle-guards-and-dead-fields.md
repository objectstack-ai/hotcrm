---
'hotcrm': patch
---

Retire two rules that could never fire, give `crm_case.first_response_date` its
missing writer, and constrain the quote and contract lifecycles (#575 group B).

`crm_lead`'s `cannot_edit_converted` validation is deleted. The code described
it as the friendly, recoverable half of a two-layer converted-lead lock, but the
`beforeUpdate` throw in `lead.hook.ts` aborts the write first, so the validation
never produced that error on any field — the same dead-configuration shape as
the `revenue_positive` rule removed in #571. The hook is now the single guard,
and its message (which names the offending fields) is the one users see.

`crm_opportunity.created_date` is deleted. It duplicated the platform's own
`created_at` and had no writer at all, so it was null on every row while
`deal_timeline` used it as `startDateField` — the timeline had no start dates.
The view now reads `created_at` (the spelling the lead activity calendar already
used) and the four locale packs no longer label a field that does not exist.
`crm_case.created_date` is a different field with a real writer and is untouched.

`crm_case.first_response_date` was the only member of the case SLA family with
no writer — `sla_due_date` and `resolution_time_hours` come from `case.hook`,
`is_sla_violated` from the `case_sla_monitor` flow — so the most standard
service-desk metric was permanently null. It is now stamped by the shared
`logActivityAction` body, on the first `sys_activity` a case receives: the
industry definition (Salesforce `FirstResponseDateTime`, Zendesk first reply
time) is when the customer first heard back, so a logged call or meeting is the
event, deliberately NOT a status change — an agent can move a case to "in
progress" and investigate for an hour while the customer hears nothing. The
field drops `readonly`, which would otherwise silently discard the write
(#2948), and the body reads the stored value rather than the dispatched record
so a projected record cannot turn "first response" into "last response".

`crm_quote` and `crm_contract` gain `state_machine` validations. Neither had a
transition table OR a status guard in its hook, so `draft → accepted` on a quote
(binding numbers nobody reviewed or sent) and `draft → activated` on a contract
(which stamps `signed_date`, promotes the account to `customer` and starts the
renewal clock) were both legal. Warning severity, matching the lead / opportunity
/ case machines. `crm_campaign` and `crm_task` deliberately get nothing — their
status is descriptive, not a controlled lifecycle — and a new test pins that
absence so it stays a decision rather than a gap.

New guards live in `test/converted-lead-guard.test.ts`,
`test/case-first-response.test.ts`, `test/opportunity-creation-date.test.ts` and
`test/status-state-machines.test.ts`. The first-response tests run the shipped
action body through the real QuickJS sandbox added in #575 A1, because the two
things that can break the stamp — the `api.read` capability and the engine
facade's `update(data, options)` signature — only exist there.

---
"hotcrm": patch
---

Service and state-machine docs: write the last of the cases and state-machine pages to source.

`content/docs/administration/state-machines` claimed throughout that a state machine
**enforces** transitions — that users "can't put records into nonsensical states", that
the status dropdown "only shows valid next states", that a disallowed move "shows an
error", and that an admin can grant a "bypass state machine" permission. Measured on the
engine, all five `state_machine` rules are `warning` severity: an illegal move is written
to the server log and **the save still goes through**, the create path is not checked at
all, nothing in this app filters a picklist by the transition table, and no bypass
permission exists (nor is one needed). Those passages now say what the tables do — declare
a machine-readable route and report departures from it — and what they do not do. The
"Configure at Setup → Object → Status → State Machine" line is replaced with where the
tables actually live (`validations[]` on the object).

`content/docs/service/cases` gets the same treatment for the claims that survived earlier
rounds: status progression is advice rather than a gate; the SLA due date is stamped on
**Critical** cases only; the breach flag is **SLA Violated** (`is_sla_violated`) and is set
by the hourly sweep on overdue open cases, never by comparing resolution time to a target;
and the *Standard list views* section is replaced with the seven views `crm_case` actually
ships — six of the seven names it used to list were metric tiles, an old name for the
kanban, or nothing at all. The manager tips lose the agent leaderboard, which the
`case_metrics` dataset cannot express (it has no owner dimension).

Also: the **Contract Renewal Reminder** automation is a flow, not a "workflow" — corrected
on `content/docs/whats-new` and in the state-machines and integrations pages, where
`workflow` named a metadata type this platform removed in 7.7.

All changes are English, Simplified Chinese and Traditional Chinese. Documentation only —
no metadata changed.

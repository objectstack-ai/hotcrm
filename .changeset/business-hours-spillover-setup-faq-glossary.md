---
'hotcrm': patch
---

Write the three remaining business-hours claims to what the app actually ships,
in all three locales. PR #924 fixed the two on `service/sla-and-escalation`; the
same promise was still being made on the setup checklist, in the FAQ and in the
glossary, and the setup page had ended up contradicting the SLA page outright.
Every claim was re-confirmed against `origin/main` first: `business_hours`,
`workingHours`, `businessCalendar` and `slaCalendar` have zero occurrences in
`src/`, the only `business.?hour` matches are three product-description strings
in the seed data, and the only code that computes an SLA deadline is
`due.setHours(due.getHours() + 4)` in `src/objects/case.hook.ts` — wall-clock
hours, stamped for `critical` and no other priority.

**`administration/setup` no longer sends admins to a screen that does not
exist.** Day-1 section 2 was a checklist — three checkboxes under a bold
**Setup → Business Hours** heading — telling a new admin to enter working days,
working hours and the year's holidays, then closing with "business hours drive
SLA calculations". There is no such screen, none of the three settings exist,
and after #924 the page it linked to says so in as many words, so the two pages
disagreed about the same feature. The section keeps its number and its name (a
reader who was sent looking for it needs to find out what happened to it) and
now states plainly that there is nothing to configure, that deadlines therefore
run on calendar hours, and that the four-hour Critical target is the only
deadline the app computes. The old example, "resolve within 8 business hours",
is High's service commitment: nothing stamps `sla_due_date` for High, so it is
now named as a promise the team keeps rather than a clock the app runs.

**`reference/faq` no longer lists two fictional preconditions for the SLA
clock.** "My SLA clock isn't running" told the reader to check that business
hours were configured and that the case's priority had an SLA defined, then
added that cases without a priority get the default SLA. None of the three is
real — there is no business-hours setup, no per-priority SLA definition screen
and no default SLA. This was the expensive one: an admin whose High case was not
being timed went looking for a configuration problem, when the reason is that
the hook stamps `sla_due_date` for `critical` only. The answer now opens by
saying there is no countdown at all, and the checklist is the real one — open
status (`case_sla_monitor` filters `status: { $nin: ['resolved', 'closed'] }`),
a due date present at all, and that due date already past with an hourly sweep
having run since. The first bullet, open status, was already correct and is
unchanged.

**`reference/glossary` keeps the term and loses the false half.** The entry
defined business hours as "working days and hours used in SLA calculations",
which describes a concept this app does not have and asserts a use it does not
make. It now gives the industry meaning, states that HotCRM has none of it, and
points at where the one real deadline comes from.

Whether the app *should* grow a business-hours calendar, per-priority SLA
definitions or a default SLA stays open in #595 — this change records today's
behaviour only. Documentation in three locales; no metadata under `src/`
changed. Refs #928, #917, #924, #903.

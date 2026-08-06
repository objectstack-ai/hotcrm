---
"hotcrm": patch
---

State-machine docs: write the status vocabulary, the two remaining behavioural claims and the Copilot section to source.

`content/docs/administration/state-machines` used a set of lead statuses and opportunity
stages that do not exist. *Working* and *Disqualified* are not statuses at all — they are
entries in `src/mappings/lead_import.mapping.ts`, the alias table that maps a legacy
export's wording onto `contacted` and `unqualified` on import, and the product never shows
either word. The real vocabulary is *New / Contacted / Qualified / Unqualified /
Converted*, and *Contacted* and *Unqualified* had never once appeared on the page that is
supposed to be authoritative about them. On the opportunity side, *Closed Without Decision*
exists nowhere in this app and the real *Needs Analysis* stage was missing, so the page
listed seven stages of which one was invented and one was absent. Both diagrams, both
transition tables and the lede now come from the `state_machine` rules themselves.

Two claims about the shape of the route were backwards. The page gave *New → Converted* as
its example of a **disallowed** move; that edge is in the table **deliberately**, because
Convert Lead is offered on any open lead and the `lead_conversion` flow stamps
`status: 'converted'` at the end — forbidding it would make every conversion from an
unworked lead log a spurious warning. And *Unqualified* was drawn as a terminal state when
it is the one status with a way back (a re-open to *New*), while the opportunity section
advertised free backwards movement and a reopen path that the table declares nowhere.

Also corrected on the same page: **Close Date** and **Amount** are `required: true`
unconditionally rather than from *Proposal* and *Negotiation* onwards; approval starts at
**$100K** (`src/flows/opportunity-approval.flow.ts`), with **$500K** being the second,
Sales-Director tier rather than the entry threshold — so a $200K deal does go through
approval, which the old wording denied. The won/lost-reason requirement was already
correct and is unchanged. The **AI Copilot** section, which described the Copilot
withholding suggestions until a status allowed the move, is replaced by what can actually
be shown: no skill under `src/skills/` and no action under `src/actions/` references a
transition table, and whether the platform's own agent reads one is left explicitly
unclaimed rather than asserted in either direction.

`content/docs/administration/setup`'s stage/probability table carried the same phantom
stage, and dropping it exposed that the missing *Needs Analysis* had shifted every
probability below it by one row — *Proposal* and *Negotiation* were showing 40% and 60%
against a source that says 60% and 80%. The table now matches `STAGE_PROBABILITY` in
`src/objects/opportunity.hook.ts`.

All changes are English, Simplified Chinese and Traditional Chinese. Documentation only —
no metadata changed.

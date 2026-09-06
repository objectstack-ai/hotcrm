---
'hotcrm': patch
---

Retire `crm_case.customer_rating` and `customer_feedback`, and the
`case_csat_followup` flow that existed to collect them (#1428).

**What this closes is a declared-but-unenforced hole, not two spare columns.**
Both fields were writable, translated in four locales, and reachable from no
screen in the product — no form, no detail section, no list column, no filter.
Nothing in the app wrote them either, outside seed data. And neither field was
named in any profile's `fields` map: on this platform field permissions are
built only from the fields a permission set names, so an unnamed field is
**default-open**. The one thing a CRM must be able to say about a satisfaction
score — who gave it — was the one thing this shape could not say. A score typed
by the person being scored is not the same fact as one the customer gave, and a
system that cannot tell them apart reports a number it cannot defend.

The maintainer ruled ADR-0049 **enforce-or-remove**: no staff hand-entry
surface, and no survey feature for now. A customer-answered survey remains the
sound long-term shape and is not precluded — it is a feature, with its own
intake, identity and anonymous write path, and it would arrive as its own card.

`case_csat_followup` goes with the fields rather than being rewritten. Its whole
purpose was to notify the case owner, a day after close, to "log their
satisfaction rating" against a record page that had nowhere to put one — a
shipped feedback loop with no landing point. With the fields gone it feeds
nothing, and nothing else was measured to want it, so retirement is the honest
answer; a rewrite would have had to invent a new purpose to justify keeping the
name.

Also gone with them: the four-locale label and help entries, the flow's row in
the built-in automation table on all three doc locales, the CSAT knob in the
packaged admin handbook, and the satisfaction section of the packaged service
guide. The analytics pages that explained why "CSAT by Agent" could not be built
now say so for the stronger reason — there is no satisfaction data at all,
rather than a field no measure aggregates.

**Upgrade note.** Any stored `customer_rating` / `customer_feedback` values stop
being read or written by the app. Nothing in this repo migrates them; export
them before upgrading if an org has data worth keeping.

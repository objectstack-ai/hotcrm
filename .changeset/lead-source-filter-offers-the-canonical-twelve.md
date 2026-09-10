---
'hotcrm': patch
---

Fix the Executive dashboard's **Lead Source** filter: it offered `advertising`, a
value no record can hold, and it offered only six of the twelve real sources.

Picking *Advertising* produced the worst failure shape a filter has. `advertising`
is not a `lead_source` value anywhere — the canonical spelling is `advertisement`,
and `crm_lead`, `crm_contact` and `crm_opportunity` all take their options from
one shared constant — so the control ANDed a term no row matches into every widget
bound to it and the dashboard went to zero with no error, no empty state, and
nothing to tell the reader apart from a business with no pipeline. Measured on the
demo database: **Open Leads** reads 21 unfiltered, **2** under the fixed
*Advertisement*, and **0** under the old *Advertising*.

The roster is repaired at the same time, and repaired so it cannot drift again.
The hand-copied six are gone: the option list is now derived from the canonical
picklist, so the filter offers all twelve sources — *Webinar*, *Paid Search*,
*Social Media*, *Content / Blog*, *Email Campaign* and *Other* were unreachable
before — and a source added to the canonical set reaches this control by existing.
Only the wording is still written on the dashboard, in all four locales, and it is
the language packs' own: *Advertisement* rather than *Advertising*, and
*Event / Trade Show* rather than the shortened *Event* the filter used to show.

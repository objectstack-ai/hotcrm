---
'hotcrm': patch
---

The opportunity and case Details tabs now declare only the fields they actually
render. Both pages listed fields their own highlights strip already shows — the
opportunity's Details tab authored fourteen fields across three sections and put
two on the screen — so the source promised a page nobody ever saw.

`record:details` composes three rules the author never sees. Measured against
the console this app ships with (`@objectstack/console` 17.1.0, objectui's
`RecordDetailsRenderer` / `DetailSection`): a mounted `record:highlights`
registers its field names, and the details body drops every one of them so no
value prints twice; it also drops the record's title field, because the page
heading already shows it; and each section then hides its empty fields, with a
section left holding nothing at all rendering nothing — no heading, no shell.
Nothing warns at author time, so the divergence is invisible until you open the
tab and count.

So the opportunity's **Opportunity Information** section now carries `type` /
`lead_source` / `crm_campaign` (its `name`, `crm_account` and `owner_id` live in
the header and the strip), **Stage & Forecast** carries `stage` /
`forecast_category` (`amount`, `close_date`, `probability` and
`expected_revenue` are in the strip), and **Description** is unchanged. On the
case page, **Case Information** carries `case_number` / `crm_contact` / `type` /
`origin` and **Status & SLA** carries `is_escalated` / `escalation_reason` /
`resolution_time_hours`. Section names and labels are untouched, so every locale
still resolves. Note that the object-level `highlightFields` list is a different
thing and is not consulted by this component — `stage` is in the opportunity's
and renders normally.

Two author-time warnings on the same two components are fixed in passing:
`columns` is a string enum (`'2'`, not `2`) in `@objectstack/spec` 17, and
`layout` was removed there entirely (#6946, ADR-0087 D2) — it selected nothing.

`test/detail-section-dedup.test.ts` holds the class shut: no `record:details`
section may name a field its page highlights, or the record's title field.

Because the renderer already dropped these names before rendering, the tab looks
the same as it did — what changes is that the metadata now tells the truth about
it. A section whose fields are all empty still disappears, and no authored key
can keep it; that is platform behaviour and is filed upstream.

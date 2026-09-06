---
'hotcrm': patch
---

Correct the rationale header of `test/field-groups-coverage.test.ts`: it
justified its assertions with a mechanism #1521 measured false. Comment-only —
⛔ not one assertion changed, added, weakened or deleted.

The header claimed `fieldGroups` "is what turns a detail page from one flat
grid of every column into the sectioned layout the rest of the app uses", and
that an object with no groups "renders, it just renders badly". Both are wrong,
in different directions.

`fieldGroups` derivation lives in the console's page **synthesizer** — the path
that fabricates a record page for an object that has none authored. The
`record:details` **renderer** that draws an authored page reads neither
`fieldGroups` nor `highlightFields`: it forwards `sections`/`fields`, and the
detail view guards each with `.length > 0` and no else branch. An authored page
opts out of the synthesizer, and out of the derivation with it. `crm_lead` is
the counter-example already in the tree — `src/pages/lead_detail.page.ts`
authors six sections while `src/objects/lead.object.ts` declares ten groups the
detail renderer never consults.

The second claim understated the failure in the one direction that mattered: an
authored `record:details` that omits `sections` renders **0 sections and 0
field rows**, an empty body — not an ugly one. That is the same understatement
that let #806's ruling be written on a mechanism that does not exist, which is
why the correction says so in the file rather than merely fixing the sentence.

⚠️ Provenance is recorded with its expiry, because the point of the card is that
unmeasured mechanism claims are what caused this: the 0/0 is R28's browser
measurement on #806 (headless Chromium, wiped DB, `@objectstack/console`
17.2.0, negative control included), corroborated statically by #1521 on the
installed 17.3.0 bundle. Neither #1521 nor this change re-ran the browser, and
the header now says so.

The assertions stay because `fieldGroups` is still load-bearing for every form
and every synthesized detail page — the header now explains that, instead of
resting on a page-level fallback that does not exist. The correction is also
bounded: a `record:details` section may name `group:` in place of `fields:` and
inherit that group's members and presentation (`deriveFieldGroupLayout`,
ADR-0085 §5, verified on the installed 17.3.0 spec), which is a per-section
opt-in rather than a page-level fallback.

`src/objects/campaign_member.object.ts` carried the same missing word in the
same sentence — "a detail page hoists the record title plus the first four
highlightFields out of the body" — and is scoped to **synthesized** here too,
matching `src/objects/opportunity_line_item.object.ts`, which already had it
right. `crm_campaign_member` authors no record page, so the claim held; only
the scope was missing.
